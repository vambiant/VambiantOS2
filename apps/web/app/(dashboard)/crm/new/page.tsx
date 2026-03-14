'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  useToast,
} from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

const typeDisplayToApi: Record<string, 'client' | 'contractor' | 'partner'> = {
  Auftraggeber: 'client',
  Fachplaner: 'partner',
  Ausführende: 'contractor',
};

export default function NewCRMPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [phone, setPhone] = useState('');
  const [fax, setFax] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [ustId, setUstId] = useState('');
  const [handelsregister, setHandelsregister] = useState('');
  const [zahlungsziel, setZahlungsziel] = useState('30');
  const [notes, setNotes] = useState('');

  const createMutation = trpc.crm.organizations.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Organisation erstellt',
        description: `${data.name} wurde erfolgreich angelegt.`,
      });
      router.push(`/crm/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Fehler beim Erstellen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!type || !name.trim()) {
      toast({
        title: 'Fehlende Pflichtfelder',
        description: 'Bitte Typ und Firmenname angeben.',
        variant: 'destructive',
      });
      return;
    }

    const apiType = typeDisplayToApi[type];
    if (!apiType) return;

    createMutation.mutate({
      type: apiType,
      name: name.trim(),
      legalForm: legalForm || undefined,
      address: {
        street: street || undefined,
        zip: zip || undefined,
        city: city || undefined,
        country: country || undefined,
      },
      contact: {
        phone: phone || undefined,
        fax: fax || undefined,
        email: email || undefined,
        website: website || undefined,
      },
      financial: {
        paymentTerms: zahlungsziel ? parseInt(zahlungsziel) : undefined,
      },
      notes: notes || undefined,
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Neuer Kontakt
          </h1>
          <p className="text-muted-foreground">
            Legen Sie eine neue Organisation im CRM an
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Type & Name */}
        <Card>
          <CardHeader>
            <CardTitle>Grunddaten</CardTitle>
            <CardDescription>
              Typ und Bezeichnung der Organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Typ *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Auftraggeber">Auftraggeber</SelectItem>
                  <SelectItem value="Fachplaner">Fachplaner</SelectItem>
                  <SelectItem value="Ausführende">Ausführende Firma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Firmenname *</Label>
                <Input
                  id="name"
                  placeholder="z.B. Muster GmbH"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal-form">Rechtsform</Label>
                <Select value={legalForm} onValueChange={setLegalForm}>
                  <SelectTrigger id="legal-form">
                    <SelectValue placeholder="Rechtsform auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GmbH">GmbH</SelectItem>
                    <SelectItem value="AG">AG</SelectItem>
                    <SelectItem value="GmbH & Co. KG">GmbH & Co. KG</SelectItem>
                    <SelectItem value="OHG">OHG</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="e.K.">e.K.</SelectItem>
                    <SelectItem value="GbR">GbR</SelectItem>
                    <SelectItem value="Einzelunternehmen">Einzelunternehmen</SelectItem>
                    <SelectItem value="Körperschaft">Körperschaft öff. Rechts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Straße und Hausnummer</Label>
              <Input
                id="street"
                placeholder="Musterstraße 1"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="zip">PLZ</Label>
                <Input
                  id="zip"
                  placeholder="10115"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  placeholder="Berlin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Kontaktdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+49 30 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input
                  id="fax"
                  type="tel"
                  placeholder="+49 30 ..."
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Webseite</Label>
                <Input
                  id="website"
                  placeholder="www.firma.de"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader>
            <CardTitle>Finanzdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ust-id">USt-Identifikationsnummer</Label>
                <Input
                  id="ust-id"
                  placeholder="DE123456789"
                  value={ustId}
                  onChange={(e) => setUstId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handelsregister">Handelsregister</Label>
                <Input
                  id="handelsregister"
                  placeholder="HRB 12345 AG Berlin"
                  value={handelsregister}
                  onChange={(e) => setHandelsregister(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zahlungsziel">Zahlungsziel (Tage)</Label>
              <Input
                id="zahlungsziel"
                type="number"
                min={0}
                value={zahlungsziel}
                onChange={(e) => setZahlungsziel(e.target.value)}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Zusätzliche Informationen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Kontakt erstellen
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/crm">Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
