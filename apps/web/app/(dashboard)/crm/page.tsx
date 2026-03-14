'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Grid3X3,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

interface Organization {
  id: number;
  name: string;
  type: string;
  status: string | null;
  contactCount: number;
  lastActivity: string;
  city: string;
  phone: string;
}

// Map API types to display labels
const typeApiToDisplay: Record<string, string> = {
  client: 'Auftraggeber',
  partner: 'Fachplaner',
  contractor: 'Ausführende',
};

const typeDisplayToApi: Record<string, string> = {
  Auftraggeber: 'client',
  Fachplaner: 'partner',
  Ausführende: 'contractor',
};

const statusApiToDisplay: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
};

function getTypeColor(type: string): string {
  switch (type) {
    case 'Auftraggeber':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Fachplaner':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'Ausführende':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Aktiv':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Interessent':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'Inaktiv':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function OrganizationCard({ org }: { org: Organization }) {
  return (
    <Link
      href={`/crm/${org.id}`}
      className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:underline">{org.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getTypeColor(org.type)}`}
            >
              {org.type}
            </span>
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(org.status ?? 'Inaktiv')}`}
            >
              {org.status}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{org.contactCount} Kontakte</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{org.city}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{org.phone}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        Letzte Aktivität: {formatDate(org.lastActivity)}
      </div>
    </Link>
  );
}

function OrganizationTableRow({ org }: { org: Organization }) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="px-4 py-3">
        <Link
          href={`/crm/${org.id}`}
          className="flex items-center gap-3 hover:underline"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-medium">{org.name}</span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getTypeColor(org.type)}`}
        >
          {org.type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(org.status)}`}
        >
          {org.status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{org.contactCount}</td>
      <td className="px-4 py-3 text-muted-foreground">{org.city}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(org.lastActivity)}
      </td>
    </tr>
  );
}

export default function CRMPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch all three types
  const { data: clientsData, isLoading: clientsLoading } = trpc.crm.organizations.list.useQuery({
    type: 'client',
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter === 'Aktiv' ? 'active' : statusFilter === 'Inaktiv' ? 'inactive' : undefined) as 'active' | 'inactive' | 'archived' | undefined : undefined,
    page: 1,
    pageSize: 100,
  });
  const { data: partnersData, isLoading: partnersLoading } = trpc.crm.organizations.list.useQuery({
    type: 'partner',
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter === 'Aktiv' ? 'active' : statusFilter === 'Inaktiv' ? 'inactive' : undefined) as 'active' | 'inactive' | 'archived' | undefined : undefined,
    page: 1,
    pageSize: 100,
  });
  const { data: contractorsData, isLoading: contractorsLoading } = trpc.crm.organizations.list.useQuery({
    type: 'contractor',
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter === 'Aktiv' ? 'active' : statusFilter === 'Inaktiv' ? 'inactive' : undefined) as 'active' | 'inactive' | 'archived' | undefined : undefined,
    page: 1,
    pageSize: 100,
  });

  const isLoading = clientsLoading || partnersLoading || contractorsLoading;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapOrgs = (items: any[] | undefined): Organization[] => {
    if (!items) return [];
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      type: typeApiToDisplay[item.type] ?? item.type,
      status: item.status ? (statusApiToDisplay[item.status] ?? item.status) : 'Aktiv',
      contactCount: 0,
      lastActivity: item.lastContactAt ? new Date(item.lastContactAt).toISOString().slice(0, 10) : '---',
      city: item.city ?? '---',
      phone: item.contactPhone ?? '---',
    }));
  };

  const filterOrgs = (type: string) => {
    switch (type) {
      case 'Auftraggeber': return mapOrgs(clientsData?.items);
      case 'Fachplaner': return mapOrgs(partnersData?.items);
      case 'Ausführende': return mapOrgs(contractorsData?.items);
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">
            Kontakte und Geschäftsbeziehungen verwalten
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/new">
            <Plus className="h-4 w-4" />
            Neuer Kontakt
          </Link>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Organisationen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Aktiv', 'Interessent', 'Inaktiv'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`inline-flex h-9 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-accent'
              }`}
            >
              {status === 'all' ? 'Alle' : status}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex h-9 items-center rounded-l-md px-3 text-sm transition-colors ${
              viewMode === 'grid'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex h-9 items-center rounded-r-md border-l px-3 text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="auftraggeber">
        <TabsList>
          <TabsTrigger value="auftraggeber">
            Auftraggeber ({filterOrgs('Auftraggeber').length})
          </TabsTrigger>
          <TabsTrigger value="fachplaner">
            Fachplaner ({filterOrgs('Fachplaner').length})
          </TabsTrigger>
          <TabsTrigger value="ausfuehrende">
            Ausführende ({filterOrgs('Ausführende').length})
          </TabsTrigger>
        </TabsList>

        {(['Auftraggeber', 'Fachplaner', 'Ausführende'] as const).map((type) => (
          <TabsContent
            key={type}
            value={
              type === 'Auftraggeber'
                ? 'auftraggeber'
                : type === 'Fachplaner'
                  ? 'fachplaner'
                  : 'ausfuehrende'
            }
          >
            {viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterOrgs(type).map((org) => (
                  <OrganizationCard key={org.id} org={org} />
                ))}
                {filterOrgs(type).length === 0 && (
                  <div className="col-span-full py-12 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Keine Organisationen gefunden
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Typ
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Kontakte
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Stadt
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Letzte Aktivität
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterOrgs(type).map((org) => (
                        <OrganizationTableRow key={org.id} org={org} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {filterOrgs(type).length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Keine Organisationen gefunden
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
