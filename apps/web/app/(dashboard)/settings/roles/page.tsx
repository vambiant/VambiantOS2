'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

interface Permission {
  id: string;
  label: string;
  description: string;
}

interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

const permissionGroups: PermissionGroup[] = [
  {
    name: 'Projekte',
    permissions: [
      { id: 'projects.view', label: 'Projekte anzeigen', description: 'Projekte und deren Details einsehen' },
      { id: 'projects.create', label: 'Projekte erstellen', description: 'Neue Projekte anlegen' },
      { id: 'projects.edit', label: 'Projekte bearbeiten', description: 'Bestehende Projekte ändern' },
      { id: 'projects.delete', label: 'Projekte löschen', description: 'Projekte dauerhaft entfernen' },
    ],
  },
  {
    name: 'Finanzen',
    permissions: [
      { id: 'invoices.view', label: 'Rechnungen anzeigen', description: 'Rechnungen und Zahlungen einsehen' },
      { id: 'invoices.create', label: 'Rechnungen erstellen', description: 'Neue Rechnungen erstellen' },
      { id: 'invoices.approve', label: 'Rechnungen freigeben', description: 'Rechnungen zur Zahlung freigeben' },
      { id: 'costs.view', label: 'Kosten einsehen', description: 'Kostenplanung und -verfolgung' },
    ],
  },
  {
    name: 'Zeiterfassung',
    permissions: [
      { id: 'time.own', label: 'Eigene Zeiten', description: 'Eigene Zeiteinträge erfassen und bearbeiten' },
      { id: 'time.team', label: 'Team-Zeiten', description: 'Zeiteinträge des Teams einsehen und verwalten' },
      { id: 'time.approve', label: 'Zeiten freigeben', description: 'Zeiteinträge genehmigen' },
    ],
  },
  {
    name: 'Administration',
    permissions: [
      { id: 'admin.members', label: 'Mitglieder verwalten', description: 'Teammitglieder einladen und entfernen' },
      { id: 'admin.roles', label: 'Rollen verwalten', description: 'Rollen und Berechtigungen konfigurieren' },
      { id: 'admin.billing', label: 'Abrechnung verwalten', description: 'Abonnement und Zahlungsdaten ändern' },
      { id: 'admin.settings', label: 'Einstellungen', description: 'Unternehmenseinstellungen ändern' },
    ],
  },
];

interface DisplayRole {
  id: number;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  isSystem: boolean;
  permissions: string[];
}

export default function SettingsRolesPage() {
  const { toast } = useToast();

  // Load members to extract roles and count members per role
  const { data: membersData, isLoading } = trpc.companies.getMembers.useQuery();
  const members = membersData ?? [];

  // Extract unique roles from members
  const roleMap = new Map<number, { id: number; name: string; slug: string; memberCount: number; isSystem: boolean }>();
  for (const m of members) {
    if (m.role) {
      const existing = roleMap.get(m.role.id);
      if (existing) {
        existing.memberCount++;
      } else {
        roleMap.set(m.role.id, {
          id: m.role.id,
          name: m.role.name,
          slug: m.role.slug,
          memberCount: 1,
          isSystem: false,  // We infer system roles from slug
        });
      }
    }
  }

  // Build display roles with permissions
  const roles: DisplayRole[] = [...roleMap.values()].map((r) => {
    const isSystem = r.slug === 'admin';
    let permissions: string[] = [];

    // For admin, all permissions
    if (r.slug === 'admin') {
      permissions = permissionGroups.flatMap((g) => g.permissions.map((p) => p.id));
    } else if (r.slug === 'project_manager') {
      permissions = [
        'projects.view', 'projects.create', 'projects.edit',
        'invoices.view', 'invoices.create',
        'costs.view',
        'time.own', 'time.team', 'time.approve',
      ];
    } else if (r.slug === 'member') {
      permissions = ['projects.view', 'invoices.view', 'costs.view', 'time.own'];
    } else {
      // For custom roles, show basic read permissions
      permissions = ['projects.view', 'time.own'];
    }

    let description = '';
    switch (r.slug) {
      case 'admin': description = 'Voller Zugriff auf alle Funktionen'; break;
      case 'project_manager': description = 'Verwaltung von Projekten und Team-Zeiteinträgen'; break;
      case 'member': description = 'Grundlegende Projektarbeit und eigene Zeiterfassung'; break;
      default: description = `Benutzerdefinierte Rolle: ${r.name}`;
    }

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description,
      memberCount: r.memberCount,
      isSystem,
      permissions,
    };
  });

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    permissionGroups.map((g) => g.name),
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const activePermissions = selectedRole?.permissions ?? [];
  const isReadOnly = selectedRole?.isSystem ?? false;

  function toggleGroup(groupName: string) {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName],
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rollen & Berechtigungen
          </h1>
          <p className="text-muted-foreground">
            Zugriffsrechte für Ihr Team anzeigen
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Roles list */}
        <div className="space-y-2">
          {roles.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Keine Rollen vorhanden
            </div>
          ) : (
            roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selectedRoleId === role.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{role.name}</p>
                    {role.isSystem && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {role.memberCount}{' '}
                    {role.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Permission viewer */}
        <div className="rounded-xl border bg-card shadow-sm">
          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Shield className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Wählen Sie eine Rolle aus, um die Berechtigungen anzuzeigen
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedRole.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedRole.description}
                    </p>
                  </div>
                </div>

                {isReadOnly && (
                  <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Systemrollen können nicht geändert werden
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div className="divide-y">
                {permissionGroups.map((group) => {
                  const isExpanded = expandedGroups.includes(group.name);
                  const permIds = group.permissions.map((p) => p.id);
                  const checkedCount = permIds.filter((id) =>
                    activePermissions.includes(id),
                  ).length;

                  return (
                    <div key={group.name}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.name)}
                        className="flex w-full items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="flex-1 text-left">{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {checkedCount}/{permIds.length}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="pb-2 pl-14 pr-6">
                          {group.permissions.map((perm) => {
                            const isChecked = activePermissions.includes(
                              perm.id,
                            );
                            return (
                              <div
                                key={perm.id}
                                className="flex items-center gap-3 rounded-md px-3 py-2"
                              >
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                                    isChecked
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-input'
                                  }`}
                                >
                                  {isChecked && <Check className="h-3 w-3" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {perm.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
