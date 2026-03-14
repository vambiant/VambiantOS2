'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

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
    case 'active':
    case 'Aktiv':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'inactive':
    case 'Inaktiv':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

const typeApiToDisplay: Record<string, string> = {
  client: 'Auftraggeber',
  partner: 'Fachplaner',
  contractor: 'Ausführende',
};

const statusApiToDisplay: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
};

const typeDisplayToApi: Record<string, 'client' | 'contractor' | 'partner'> = {
  Auftraggeber: 'client',
  Fachplaner: 'partner',
  Ausführende: 'contractor',
};

export default function CRMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orgId = Number(params.id);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editLegalForm, setEditLegalForm] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFax, setEditFax] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const utils = trpc.useUtils();

  const { data: orgData, isLoading: orgLoading, error: orgError } = trpc.crm.organizations.getById.useQuery(
    { id: orgId },
    { enabled: !isNaN(orgId) && orgId > 0, retry: false },
  );

  const { data: activitiesData } = trpc.crm.activities.list.useQuery(
    { organizationId: orgId, page: 1, pageSize: 5 },
    { enabled: !isNaN(orgId) && orgId > 0 },
  );

  const updateMutation = trpc.crm.organizations.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Organisation aktualisiert', description: 'Änderungen wurden gespeichert.' });
      setIsEditing(false);
      utils.crm.organizations.getById.invalidate({ id: orgId });
    },
    onError: (error) => {
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.crm.organizations.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Organisation gelöscht', description: 'Die Organisation wurde erfolgreich gelöscht.' });
      router.push('/crm');
    },
    onError: (error) => {
      toast({ title: 'Fehler beim Löschen', description: error.message, variant: 'destructive' });
    },
  });

  const contacts = orgData?.contacts ?? [];
  const activities = activitiesData?.items ?? [];

  const startEditing = () => {
    if (!orgData) return;
    const addr = orgData.address as any ?? {};
    const cont = orgData.contact as any ?? {};
    setEditName(orgData.name);
    setEditType(typeApiToDisplay[orgData.type] ?? orgData.type);
    setEditLegalForm(orgData.legalForm ?? '');
    setEditStatus(orgData.status ?? 'active');
    setEditStreet(addr.street ?? '');
    setEditZip(addr.zip ?? '');
    setEditCity(addr.city ?? '');
    setEditCountry(addr.country ?? 'Deutschland');
    setEditPhone(cont.phone ?? '');
    setEditFax(cont.fax ?? '');
    setEditEmail(cont.email ?? '');
    setEditWebsite(cont.website ?? '');
    setEditNotes(orgData.notes ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const apiType = typeDisplayToApi[editType];
    if (!apiType || !editName.trim()) {
      toast({ title: 'Fehlende Pflichtfelder', description: 'Bitte Typ und Name angeben.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: orgId,
      type: apiType,
      name: editName.trim(),
      legalForm: editLegalForm || undefined,
      status: editStatus as 'active' | 'inactive',
      address: { street: editStreet || undefined, zip: editZip || undefined, city: editCity || undefined, country: editCountry || undefined },
      contact: { phone: editPhone || undefined, fax: editFax || undefined, email: editEmail || undefined, website: editWebsite || undefined },
      notes: editNotes || undefined,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: orgId });
  };

  const orgName = orgData?.name ?? `Organisation #${orgId}`;
  const orgType = orgData?.type ? (typeApiToDisplay[orgData.type] ?? orgData.type) : '---';
  const orgStatus = orgData?.status ?? 'active';
  const orgStatusDisplay = statusApiToDisplay[orgStatus] ?? orgStatus;
  const addr = orgData?.address as any ?? {};
  const cont = orgData?.contact as any ?? {};
  const fin = orgData?.financial as any ?? {};

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <p className="text-sm text-destructive">
            Organisation konnte nicht geladen werden: {orgError.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {orgName}
                </h1>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getTypeColor(orgType)}`}>
                  {orgType}
                </span>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(orgStatus)}`}>
                  {orgStatusDisplay}
                </span>
              </div>
              {orgData?.legalForm && (
                <p className="text-sm text-muted-foreground">{orgData.legalForm}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Organisation löschen?</DialogTitle>
                    <DialogDescription>
                      Möchten Sie &quot;{orgName}&quot; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Löschen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Details Section */}
      {isEditing ? (
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
          <Card>
            <CardHeader><CardTitle className="text-base">Grunddaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auftraggeber">Auftraggeber</SelectItem>
                    <SelectItem value="Fachplaner">Fachplaner</SelectItem>
                    <SelectItem value="Ausführende">Ausführende</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rechtsform</Label>
                <Input value={editLegalForm} onChange={(e) => setEditLegalForm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Adresse</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Straße</Label>
                <Input value={editStreet} onChange={(e) => setEditStreet(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PLZ</Label>
                  <Input value={editZip} onChange={(e) => setEditZip(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ort</Label>
                  <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Land</Label>
                <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Kontaktdaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fax</Label>
                  <Input value={editFax} onChange={(e) => setEditFax(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-Mail</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Webseite</Label>
                <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Notizen</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontaktdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {[addr.street, [addr.zip, addr.city].filter(Boolean).join(' '), addr.country]
                    .filter(Boolean)
                    .join(', ') || '---'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{cont.phone || '---'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{cont.email ? (
                  <a href={`mailto:${cont.email}`} className="hover:text-foreground hover:underline">{cont.email}</a>
                ) : '---'}</span>
              </div>
              {cont.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a href={cont.website.startsWith('http') ? cont.website : `https://${cont.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                    {cont.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finanzdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {orgData?.vatId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">USt-ID</span>
                  <span>{orgData.vatId}</span>
                </div>
              )}
              {orgData?.taxId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Steuernummer</span>
                  <span>{orgData.taxId}</span>
                </div>
              )}
              {fin.paymentTerms != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zahlungsziel</span>
                  <span>{fin.paymentTerms} Tage</span>
                </div>
              )}
              {fin.iban && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IBAN</span>
                  <span className="font-mono text-xs">{fin.iban}</span>
                </div>
              )}
              {!orgData?.vatId && !orgData?.taxId && !fin.paymentTerms && !fin.iban && (
                <p className="text-muted-foreground">Keine Finanzdaten hinterlegt</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {orgData?.notes || 'Keine Notizen vorhanden'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      {!isEditing && (
        <Tabs defaultValue="kontakte">
          <TabsList>
            <TabsTrigger value="kontakte">
              Kontakte ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="aktivitaeten">Aktivitäten ({activities.length})</TabsTrigger>
            <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          </TabsList>

          {/* Kontakte Tab */}
          <TabsContent value="kontakte">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/crm/${orgId}/contacts`}>
                    <Users className="h-4 w-4" />
                    Alle Kontakte verwalten
                  </Link>
                </Button>
              </div>
              {contacts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      Keine Kontakte vorhanden
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {contacts.map((contact: any) => (
                    <Card key={contact.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{contact.firstName} {contact.lastName}</p>
                              {contact.isPrimary && (
                                <Badge variant="secondary" className="text-xs">
                                  Hauptkontakt
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {contact.position ?? '---'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="truncate hover:text-foreground hover:underline"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aktivitäten Tab */}
          <TabsContent value="aktivitaeten">
            <Card>
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Keine Aktivitäten vorhanden
                  </div>
                ) : (
                  <div className="divide-y">
                    {activities.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-4 px-6 py-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {activity.activityType.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {activity.activityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.createdAt).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{activity.subject ?? activity.description ?? '---'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            von {activity.userName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dokumente Tab */}
          <TabsContent value="dokumente">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Noch keine Dokumente vorhanden
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  Dokument hochladen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
