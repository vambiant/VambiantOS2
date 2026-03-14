'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Plus,
  Search,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
} from '@vambiant/ui';

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  projectRole: string;
}

const mockTeam: TeamMember[] = [
  { id: '1', name: 'Max Mustermann', initials: 'MM', email: 'max@buero.de', role: 'Projektleiter', projectRole: 'admin' },
  { id: '2', name: 'Anna Schmidt', initials: 'AS', email: 'anna@buero.de', role: 'Architektin', projectRole: 'editor' },
  { id: '3', name: 'Thomas Müller', initials: 'TM', email: 'thomas@buero.de', role: 'Tragwerksplaner', projectRole: 'editor' },
  { id: '4', name: 'Lisa Weber', initials: 'LW', email: 'lisa@buero.de', role: 'TGA-Planerin', projectRole: 'editor' },
  { id: '5', name: 'Stefan Braun', initials: 'SB', email: 'stefan@buero.de', role: 'Bauzeichner', projectRole: 'viewer' },
];

const availableMembers = [
  { id: '6', name: 'Claudia Fischer', initials: 'CF', email: 'claudia@buero.de', role: 'Bauleiterin' },
  { id: '7', name: 'Peter Hoffmann', initials: 'PH', email: 'peter@buero.de', role: 'Kostenschätzer' },
  { id: '8', name: 'Maria Lange', initials: 'ML', email: 'maria@buero.de', role: 'Projektassistenz' },
];

const projectRoleLabels: Record<string, string> = {
  admin: 'Administrator',
  editor: 'Bearbeiter',
  viewer: 'Betrachter',
};

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [form, setForm] = useState({
    name: 'Neubau Bürogebäude Friedrichstraße',
    code: 'PRJ-2026-001',
    description: 'Neubau eines 6-geschossigen Bürogebäudes mit Tiefgarage in der Friedrichstraße, Berlin-Mitte. Bruttogeschossfläche ca. 8.500 m², Honorarzone IV.',
    startDate: '2025-10-01',
    endDate: '2027-12-31',
    status: 'aktiv',
    isTemplate: false,
  });

  const [team, setTeam] = useState(mockTeam);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleRoleChange = (memberId: string, newRole: string) => {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, projectRole: newRole } : m,
      ),
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleAddMember = (member: (typeof availableMembers)[0]) => {
    const newMember: TeamMember = {
      ...member,
      projectRole: 'viewer',
    };
    setTeam((prev) => [...prev, newMember]);
    setAddMemberOpen(false);
    setMemberSearch('');
  };

  const filteredAvailableMembers = availableMembers.filter(
    (m) =>
      !team.find((t) => t.id === m.id) &&
      (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Project details */}
      <Card>
        <CardHeader>
          <CardTitle>Projektdaten</CardTitle>
          <CardDescription>
            Grundlegende Informationen zum Projekt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="settings-name">Projektname</Label>
              <Input
                id="settings-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="settings-code">Projektnummer</Label>
              <Input
                id="settings-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="settings-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planung">Planung</SelectItem>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="pausiert">Pausiert</SelectItem>
                  <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="settings-description">Beschreibung</Label>
              <Textarea
                id="settings-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="settings-start">Startdatum</Label>
              <Input
                id="settings-start"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="settings-end">Enddatum</Label>
              <Input
                id="settings-end"
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>Änderungen speichern</Button>
          </div>
        </CardContent>
      </Card>

      {/* Team management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Projektteam</CardTitle>
            <CardDescription>
              Verwalten Sie die Teammitglieder und deren Rollen
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddMemberOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Mitglied hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.email} &middot; {member.role}
                  </p>
                </div>
                <Select
                  value={member.projectRole}
                  onValueChange={(value) =>
                    handleRoleChange(member.id, value)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="editor">Bearbeiter</SelectItem>
                    <SelectItem value="viewer">Betrachter</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template settings */}
      <Card>
        <CardHeader>
          <CardTitle>Vorlage</CardTitle>
          <CardDescription>
            Dieses Projekt als Vorlage für neue Projekte verwenden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Als Vorlage markieren</p>
              <p className="text-xs text-muted-foreground">
                Andere Benutzer können dieses Projekt als Grundlage für neue
                Projekte verwenden
              </p>
            </div>
            <Switch
              checked={form.isTemplate}
              onCheckedChange={(checked) =>
                setForm({ ...form, isTemplate: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Gefahrenzone</CardTitle>
          <CardDescription>
            Diese Aktionen können nicht rückgängig gemacht werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
            <div>
              <p className="text-sm font-medium">Projekt archivieren</p>
              <p className="text-xs text-muted-foreground">
                Das Projekt wird archiviert und aus der aktiven Liste entfernt
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveConfirmOpen(true)}
            >
              <Archive className="mr-1 h-3.5 w-3.5" />
              Archivieren
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium text-destructive">
                Projekt löschen
              </p>
              <p className="text-xs text-muted-foreground">
                Alle Projektdaten werden unwiderruflich gelöscht
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Löschen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitglied hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein Teammitglied zum Projekt hinzu
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name oder E-Mail suchen..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="mt-3 space-y-1">
              {filteredAvailableMembers.length > 0 ? (
                filteredAvailableMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                    onClick={() => handleAddMember(member)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email} &middot; {member.role}
                      </p>
                    </div>
                    <Plus className="ml-auto h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Keine verfügbaren Mitglieder gefunden
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive confirm dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Projekt archivieren
            </DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie dieses Projekt archivieren möchten? Das
              Projekt wird aus der aktiven Liste entfernt, kann aber später
              wiederhergestellt werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveConfirmOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                setArchiveConfirmOpen(false);
                router.push('/projects');
              }}
            >
              Archivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Projekt löschen
            </DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie dieses Projekt unwiderruflich löschen
              möchten? Alle Daten, Aufgaben, Dateien und Kommentare werden
              gelöscht und können nicht wiederhergestellt werden.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirm">
              Geben Sie den Projektnamen ein, um zu bestätigen:
            </Label>
            <Input
              id="delete-confirm"
              placeholder={form.name}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteConfirmOpen(false);
                router.push('/projects');
              }}
            >
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
