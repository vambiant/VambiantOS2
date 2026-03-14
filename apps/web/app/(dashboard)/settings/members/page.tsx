'use client';

import { useState } from 'react';
import {
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const roleSlugToDisplay: Record<string, string> = {
  admin: 'Administrator',
  project_manager: 'Projektleiter',
  member: 'Mitglied',
};

function getStatusBadge(status: 'active' | 'invited' | 'deactivated') {
  switch (status) {
    case 'active':
      return {
        label: 'Aktiv',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        icon: UserCheck,
      };
    case 'invited':
      return {
        label: 'Eingeladen',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        icon: Mail,
      };
    case 'deactivated':
      return {
        label: 'Deaktiviert',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400',
        icon: UserX,
      };
  }
}

function getRoleBadge(role: string) {
  if (role === 'Administrator') {
    return 'bg-primary/10 text-primary';
  }
  if (role === 'Projektleiter') {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
  }
  return 'bg-muted text-muted-foreground';
}

export default function SettingsMembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Mitarbeiter');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingRoleForUserId, setEditingRoleForUserId] = useState<number | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>('');
  const { toast } = useToast();

  const utils = trpc.useUtils();
  const { data: membersData, isLoading, error } = trpc.companies.getMembers.useQuery();

  const inviteMutation = trpc.companies.inviteMember.useMutation({
    onSuccess: () => {
      utils.companies.getMembers.invalidate();
      setInviteEmail('');
      setShowInviteForm(false);
      toast({
        title: 'Einladung gesendet',
        description: `Einladung wurde an ${inviteEmail} gesendet.`,
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler beim Einladen',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const removeMutation = trpc.companies.removeMember.useMutation({
    onSuccess: () => {
      utils.companies.getMembers.invalidate();
      toast({
        title: 'Mitglied entfernt',
        description: 'Das Mitglied wurde erfolgreich entfernt.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler beim Entfernen',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = trpc.companies.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.companies.getMembers.invalidate();
      setEditingRoleForUserId(null);
      setNewRoleId('');
      toast({
        title: 'Rolle geändert',
        description: 'Die Rolle wurde erfolgreich aktualisiert.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler beim Ändern der Rolle',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Extract unique roles from members for role change dropdown
  const availableRoles = new Map<number, { id: number; name: string; slug: string }>();
  (membersData ?? []).forEach((m) => {
    if (m.role) {
      availableRoles.set(m.role.id, m.role);
    }
  });
  const roleOptions = [...availableRoles.values()];

  const members = (membersData ?? []).map((m) => {
    const firstName = m.firstName ?? '';
    const lastName = m.lastName ?? '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || m.email;
    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : m.email.substring(0, 2).toUpperCase();
    const roleName = m.role ? (roleSlugToDisplay[m.role.slug] ?? m.role.name) : 'Mitglied';
    return {
      id: m.id,
      userId: m.userId,
      name,
      email: m.email,
      role: roleName,
      roleSlug: m.role?.slug ?? 'member',
      roleId: m.role?.id ?? null,
      status: 'active' as 'active' | 'invited' | 'deactivated',
      joinedAt: m.joinedAt,
      initials,
    };
  });

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function handleInvite() {
    if (!inviteEmail) return;
    inviteMutation.mutate({ email: inviteEmail });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teammitglieder</h1>
          <p className="text-muted-foreground">
            Verwalten Sie die Mitglieder Ihres Unternehmens
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Einladen
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Neues Mitglied einladen</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Senden Sie eine Einladung per E-Mail
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-2">
              <label
                htmlFor="inviteEmail"
                className="text-sm font-medium leading-none"
              >
                E-Mail-Adresse
              </label>
              <input
                id="inviteEmail"
                type="email"
                placeholder="neue@person.de"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="w-48 space-y-2">
              <label
                htmlFor="inviteRole"
                className="text-sm font-medium leading-none"
              >
                Rolle
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {roleOptions.length > 0 ? (
                  roleOptions.map((r) => (
                    <option key={r.id} value={r.name}>{roleSlugToDisplay[r.slug] ?? r.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Administrator">Administrator</option>
                    <option value="Projektleiter">Projektleiter</option>
                    <option value="Mitarbeiter">Mitarbeiter</option>
                  </>
                )}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !inviteEmail}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Einladen
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Mitglieder suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Members list */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="divide-y">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Wird geladen...
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-destructive">
              Fehler: {error.message}
            </div>
          ) : filteredMembers.map((member) => {
            const statusBadge = getStatusBadge(member.status);
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {member.initials}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>

                {/* Role - with inline editing */}
                {editingRoleForUserId === member.userId ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={newRoleId}
                      onChange={(e) => setNewRoleId(e.target.value)}
                      className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Rolle wählen...</option>
                      {roleOptions.map((r) => (
                        <option key={r.id} value={r.id.toString()}>
                          {roleSlugToDisplay[r.slug] ?? r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (newRoleId) {
                          updateRoleMutation.mutate({
                            userId: member.userId,
                            roleId: parseInt(newRoleId, 10),
                          });
                        }
                      }}
                      disabled={!newRoleId || updateRoleMutation.isPending}
                      className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {updateRoleMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'OK'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoleForUserId(null);
                        setNewRoleId('');
                      }}
                      className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium ${getRoleBadge(member.role)}`}
                  >
                    {member.role === 'Administrator' && (
                      <Shield className="h-3 w-3" />
                    )}
                    {member.role}
                  </span>
                )}

                {/* Status */}
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusBadge.label}
                </span>

                {/* Actions */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId(openMenuId === member.id ? null : member.id)
                    }
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {openMenuId === member.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenMenuId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setOpenMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoleForUserId(member.userId);
                            setNewRoleId(member.roleId?.toString() ?? '');
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                        >
                          <Shield className="h-4 w-4" />
                          Rolle ändern
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeMutation.mutate({ userId: member.userId });
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Entfernen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {!isLoading && !error && filteredMembers.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Keine Mitglieder gefunden
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
