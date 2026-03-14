'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  Smartphone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

export default function CRMContactsPage() {
  const params = useParams();
  const orgId = Number(params.id);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);

  // Form state
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formSalutation, setFormSalutation] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);

  const { data: orgData } = trpc.crm.organizations.getById.useQuery(
    { id: orgId },
    { enabled: !isNaN(orgId) && orgId > 0 },
  );

  const { data: contacts, isLoading } = trpc.crm.contacts.list.useQuery(
    { organizationId: orgId },
    { enabled: !isNaN(orgId) && orgId > 0 },
  );

  const createMutation = trpc.crm.contacts.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Kontakt erstellt', description: 'Der Kontakt wurde erfolgreich angelegt.' });
      setSheetOpen(false);
      resetForm();
      utils.crm.contacts.list.invalidate({ organizationId: orgId });
      utils.crm.organizations.getById.invalidate({ id: orgId });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = trpc.crm.contacts.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Kontakt aktualisiert', description: 'Änderungen wurden gespeichert.' });
      setEditingContact(null);
      setSheetOpen(false);
      resetForm();
      utils.crm.contacts.list.invalidate({ organizationId: orgId });
      utils.crm.organizations.getById.invalidate({ id: orgId });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.crm.contacts.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Kontakt gelöscht', description: 'Der Kontakt wurde entfernt.' });
      setDeleteContactId(null);
      utils.crm.contacts.list.invalidate({ organizationId: orgId });
      utils.crm.organizations.getById.invalidate({ id: orgId });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormSalutation('');
    setFormTitle('');
    setFormPosition('');
    setFormDepartment('');
    setFormEmail('');
    setFormPhone('');
    setFormMobile('');
    setFormIsPrimary(false);
  };

  const openEditSheet = (contact: any) => {
    setEditingContact(contact);
    setFormFirstName(contact.firstName);
    setFormLastName(contact.lastName);
    setFormSalutation(contact.salutation ?? '');
    setFormTitle(contact.title ?? '');
    setFormPosition(contact.position ?? '');
    setFormDepartment(contact.department ?? '');
    setFormEmail(contact.email ?? '');
    setFormPhone(contact.phone ?? '');
    setFormMobile(contact.mobile ?? '');
    setFormIsPrimary(contact.isPrimary ?? false);
    setSheetOpen(true);
  };

  const openNewSheet = () => {
    setEditingContact(null);
    resetForm();
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!formFirstName.trim() || !formLastName.trim()) {
      toast({ title: 'Pflichtfelder fehlen', description: 'Vor- und Nachname sind erforderlich.', variant: 'destructive' });
      return;
    }

    const data = {
      organizationId: orgId,
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      salutation: formSalutation || undefined,
      title: formTitle || undefined,
      position: formPosition || undefined,
      department: formDepartment || undefined,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      mobile: formMobile || undefined,
      isPrimary: formIsPrimary,
    };

    if (editingContact) {
      updateMutation.mutate({ ...data, id: editingContact.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const orgName = orgData?.name ?? `Organisation #${orgId}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/crm/${orgId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Kontaktpersonen</h1>
          <p className="text-muted-foreground">
            {orgName} &middot; {contacts?.length ?? 0} Kontakte
          </p>
        </div>
        <Button onClick={openNewSheet}>
          <Plus className="h-4 w-4" />
          Kontakt hinzufügen
        </Button>
      </div>

      {/* Sheet for create/edit */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) { setEditingContact(null); resetForm(); } setSheetOpen(open); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingContact ? 'Kontakt bearbeiten' : 'Neuen Kontakt hinzufügen'}</SheetTitle>
            <SheetDescription>
              {editingContact ? `${editingContact.firstName} ${editingContact.lastName} bearbeiten` : `Neue Kontaktperson zu ${orgName} hinzufügen.`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Anrede</Label>
                <Select value={formSalutation} onValueChange={setFormSalutation}>
                  <SelectTrigger><SelectValue placeholder="---" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Herr">Herr</SelectItem>
                    <SelectItem value="Frau">Frau</SelectItem>
                    <SelectItem value="Divers">Divers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="z.B. Dr., Prof." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vorname *</Label>
                <Input value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} placeholder="Vorname" />
              </div>
              <div className="space-y-2">
                <Label>Nachname *</Label>
                <Input value={formLastName} onChange={(e) => setFormLastName(e.target.value)} placeholder="Nachname" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Input value={formPosition} onChange={(e) => setFormPosition(e.target.value)} placeholder="z.B. Projektleiter" />
              </div>
              <div className="space-y-2">
                <Label>Abteilung</Label>
                <Input value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} placeholder="z.B. Planung" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@beispiel.de" />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+49 30 ..." />
            </div>
            <div className="space-y-2">
              <Label>Mobil</Label>
              <Input type="tel" value={formMobile} onChange={(e) => setFormMobile(e.target.value)} placeholder="+49 170 ..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPrimary" checked={formIsPrimary} onChange={(e) => setFormIsPrimary(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="isPrimary">Hauptkontakt</Label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingContact ? 'Speichern' : 'Kontakt erstellen'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <Dialog open={deleteContactId !== null} onOpenChange={(open) => { if (!open) setDeleteContactId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kontakt löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie diesen Kontakt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContactId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => deleteContactId && deleteMutation.mutate({ id: deleteContactId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(contacts ?? []).map((contact: any) => (
          <div
            key={contact.id}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {contact.firstName[0]}{contact.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{contact.firstName} {contact.lastName}</p>
                  {contact.isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      Hauptkontakt
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{contact.position ?? '---'}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href={`mailto:${contact.email}`} className="truncate hover:text-foreground hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.mobile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span>{contact.mobile}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 pt-3 border-t">
              <Button variant="ghost" size="sm" onClick={() => openEditSheet(contact)}>
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteContactId(contact.id)}>
                <Trash2 className="h-3.5 w-3.5" />
                Löschen
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(!contacts || contacts.length === 0) && !isLoading && (
        <div className="py-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            Keine Kontakte vorhanden
          </p>
        </div>
      )}
    </div>
  );
}
