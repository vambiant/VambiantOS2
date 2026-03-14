'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';
import {
  DIN276_COST_GROUPS,
  getChildGroups,
  type CostGroup,
} from '@vambiant/domain';

const typeApiToDisplay: Record<string, string> = {
  kostenschaetzung: 'Kostenschaetzung',
  kostenberechnung: 'Kostenberechnung',
  kostenanschlag: 'Kostenanschlag',
  kostenfeststellung: 'Kostenfeststellung',
};

const statusApiToDisplay: Record<string, string> = {
  draft: 'Entwurf',
  active: 'In Bearbeitung',
  approved: 'Freigegeben',
  archived: 'Abgeschlossen',
};

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'active':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    case 'archived':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function parseGermanNumber(str: string): number {
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(cleaned) || 0;
}

interface CostPositionRow {
  id?: number;
  costGroupCode: string;
  name: string;
  level: number;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  totalNet: number;
  isGroup: boolean;
  children?: CostPositionRow[];
}

export default function CostEstimationDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: estimation, isLoading, error } = trpc.finance.costEstimations.getById.useQuery(
    { id },
    { enabled: id > 0 },
  );

  const createPositionMutation = trpc.finance.costPositions.create.useMutation();
  const updatePositionMutation = trpc.finance.costPositions.update.useMutation();
  const utils = trpc.useUtils();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['100', '200', '300', '400', '500', '600', '700', '800']),
  );
  const [savingPosition, setSavingPosition] = useState<number | null>(null);

  const toggleGroup = (kgNr: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(kgNr)) {
        next.delete(kgNr);
      } else {
        next.add(kgNr);
      }
      return next;
    });
  };

  // Build cost group tree from existing positions + DIN 276 structure
  const costTree = useMemo(() => {
    if (!estimation) return [];

    const positions = estimation.positions ?? [];
    const positionsByCode: Record<string, any> = {};
    for (const pos of positions) {
      positionsByCode[pos.costGroupCode] = pos;
    }

    // Get level 1 groups from DIN 276
    const level1Groups = DIN276_COST_GROUPS.filter((g) => g.level === 1);

    return level1Groups.map((group) => {
      const pos = positionsByCode[group.code];
      const children = getChildGroups(group.code);

      const childRows: CostPositionRow[] = children.map((child) => {
        const childPos = positionsByCode[child.code];
        return {
          id: childPos?.id,
          costGroupCode: child.code,
          name: child.name,
          level: 1,
          quantity: childPos ? Number(childPos.quantity ?? 0) : null,
          unit: childPos?.unit ?? '',
          unitPrice: childPos ? Number(childPos.unitPrice ?? 0) : null,
          totalNet: childPos ? Number(childPos.totalNet ?? 0) : 0,
          isGroup: false,
        };
      });

      // Sum up children totals for group total
      const groupTotal = childRows.reduce((sum, c) => sum + c.totalNet, 0);

      return {
        id: pos?.id,
        costGroupCode: group.code,
        name: group.name,
        level: 0,
        quantity: null,
        unit: '',
        unitPrice: null,
        totalNet: pos ? Number(pos.totalNet ?? 0) : groupTotal,
        isGroup: true,
        children: childRows,
      } as CostPositionRow;
    });
  }, [estimation]);

  const grandTotal = useMemo(
    () => costTree.reduce((sum, group) => sum + group.totalNet, 0),
    [costTree],
  );

  const handlePositionEdit = async (
    costGroupCode: string,
    field: 'quantity' | 'unitPrice',
    value: string,
    existingId?: number,
  ) => {
    if (!estimation) return;

    const numValue = parseGermanNumber(value);
    setSavingPosition(existingId ?? -1);

    try {
      if (existingId) {
        // Update existing position
        await updatePositionMutation.mutateAsync({
          id: existingId,
          [field]: numValue,
        });
      } else {
        // Create new position
        const group = DIN276_COST_GROUPS.find((g) => g.code === costGroupCode);
        await createPositionMutation.mutateAsync({
          estimationId: estimation.id,
          costGroupCode,
          level: group?.level ?? 2,
          shortText: group?.name,
          [field]: numValue,
          ...(field === 'quantity' ? { unitPrice: 0 } : { quantity: 0 }),
        });
      }
      utils.finance.costEstimations.getById.invalidate({ id });
    } catch {
      // error handled by mutation
    } finally {
      setSavingPosition(null);
    }
  };

  const handleAddPosition = async (parentCode: string) => {
    if (!estimation) return;

    const childGroups = getChildGroups(parentCode);
    // Find next available code
    const existingCodes = new Set(
      (estimation.positions ?? []).map((p: any) => p.costGroupCode),
    );
    const nextGroup = childGroups.find((g) => !existingCodes.has(g.code));

    if (!nextGroup) return;

    setSavingPosition(-1);
    try {
      await createPositionMutation.mutateAsync({
        estimationId: estimation.id,
        costGroupCode: nextGroup.code,
        level: nextGroup.level,
        shortText: nextGroup.name,
        quantity: 1,
        unitPrice: 0,
        unit: 'psch',
      });
      utils.finance.costEstimations.getById.invalidate({ id });
    } catch {
      // error handled
    } finally {
      setSavingPosition(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !estimation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/costs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fehler</h1>
            <p className="text-destructive">{error?.message ?? 'Kostenschaetzung nicht gefunden'}</p>
          </div>
        </div>
      </div>
    );
  }

  const displayType = typeApiToDisplay[estimation.estimationType] ?? estimation.estimationType;
  const displayStatus = statusApiToDisplay[estimation.status ?? 'draft'] ?? estimation.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/costs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {estimation.name}
            </h1>
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(estimation.status)}`}
            >
              {displayStatus}
            </span>
          </div>
          <p className="text-muted-foreground">
            Projekt: {estimation.projectName} &middot; {displayType} &middot; DIN 276
            {estimation.baseDate && ` &middot; Preisstand: ${estimation.baseDate}`}
          </p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Typ</p>
          <p className="text-lg font-semibold">{displayType}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">DIN 276 Ebene</p>
          <p className="text-lg font-semibold">{estimation.din276Level ?? 2}. Ebene</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Positionen</p>
          <p className="text-lg font-semibold">{(estimation.positions ?? []).length}</p>
        </div>
        <div className="rounded-xl border bg-primary/10 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Gesamtsumme</p>
          <p className="text-lg font-bold text-primary">
            {estimation.totalNet ? formatCurrency(Number(estimation.totalNet)) : formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      {/* DIN 276 Tree Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Kostengruppen nach DIN 276</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setExpandedGroups(new Set(costTree.map((g) => g.costGroupCode)))
              }
            >
              Alle aufklappen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedGroups(new Set())}
            >
              Alle zuklappen
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">
                  KG-Nr
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Bezeichnung
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[120px]">
                  Menge
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[80px]">
                  Einheit
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[140px]">
                  EP
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[150px]">
                  Gesamt
                </th>
              </tr>
            </thead>
            <tbody>
              {costTree.map((group) => (
                <CostGroupRows
                  key={group.costGroupCode}
                  group={group}
                  expanded={expandedGroups.has(group.costGroupCode)}
                  onToggle={() => toggleGroup(group.costGroupCode)}
                  onEdit={handlePositionEdit}
                  onAdd={handleAddPosition}
                  savingPosition={savingPosition}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-bold">
                <td className="px-4 py-3" colSpan={5}>
                  Gesamtsumme (netto)
                </td>
                <td className="px-4 py-3 text-right text-primary">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
              <tr className="bg-muted/30">
                <td className="px-4 py-2" colSpan={5}>
                  zzgl. 19% MwSt.
                </td>
                <td className="px-4 py-2 text-right">
                  {formatCurrency(grandTotal * 0.19)}
                </td>
              </tr>
              <tr className="border-t font-bold text-lg">
                <td className="px-4 py-3" colSpan={5}>
                  Gesamtsumme (brutto)
                </td>
                <td className="px-4 py-3 text-right text-primary">
                  {formatCurrency(grandTotal * 1.19)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function CostGroupRows({
  group,
  expanded,
  onToggle,
  onEdit,
  onAdd,
  savingPosition,
}: {
  group: CostPositionRow;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (code: string, field: 'quantity' | 'unitPrice', value: string, id?: number) => void;
  onAdd: (parentCode: string) => void;
  savingPosition: number | null;
}) {
  const hasChildren = group.children && group.children.length > 0;

  return (
    <>
      {/* Group row */}
      <tr className="border-b transition-colors hover:bg-muted/50 bg-muted/30 font-semibold">
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {hasChildren && (
              <button
                type="button"
                onClick={onToggle}
                className="rounded p-0.5 hover:bg-muted"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <span className="font-mono text-sm font-bold">{group.costGroupCode}</span>
          </div>
        </td>
        <td className="px-4 py-3">{group.name}</td>
        <td className="px-4 py-3" />
        <td className="px-4 py-3" />
        <td className="px-4 py-3" />
        <td className="px-4 py-3 text-right font-medium">
          {formatCurrency(group.totalNet)}
        </td>
      </tr>

      {/* Child rows */}
      {expanded &&
        group.children?.map((child) => (
          <tr
            key={child.costGroupCode}
            className="border-b transition-colors hover:bg-muted/50"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-1 pl-5">
                <span className="font-mono text-sm">{child.costGroupCode}</span>
              </div>
            </td>
            <td className="px-4 py-3">{child.name}</td>
            <td className="px-4 py-3 text-right">
              {child.quantity !== null ? (
                <Input
                  type="text"
                  defaultValue={child.quantity > 0 ? formatNumber(child.quantity) : ''}
                  className="h-8 w-24 text-right"
                  onBlur={(e) =>
                    onEdit(child.costGroupCode, 'quantity', e.target.value, child.id)
                  }
                />
              ) : null}
            </td>
            <td className="px-4 py-3 text-center text-muted-foreground">
              {child.unit}
            </td>
            <td className="px-4 py-3 text-right">
              {child.unitPrice !== null ? (
                <Input
                  type="text"
                  defaultValue={child.unitPrice > 0 ? formatNumber(child.unitPrice) : ''}
                  className="h-8 w-28 text-right"
                  onBlur={(e) =>
                    onEdit(child.costGroupCode, 'unitPrice', e.target.value, child.id)
                  }
                />
              ) : null}
            </td>
            <td className="px-4 py-3 text-right font-medium">
              {formatCurrency(child.totalNet)}
            </td>
          </tr>
        ))}

      {/* Add position button */}
      {expanded && (
        <tr className="border-b">
          <td colSpan={6} className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="ml-6 text-muted-foreground"
              onClick={() => onAdd(group.costGroupCode)}
              disabled={savingPosition !== null}
            >
              {savingPosition === -1 ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Position hinzufuegen
            </Button>
          </td>
        </tr>
      )}
    </>
  );
}
