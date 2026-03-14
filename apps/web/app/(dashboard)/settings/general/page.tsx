'use client';

import { useEffect, useState } from 'react';
import { Building2, Globe, Loader2, Save, Upload } from 'lucide-react';
import { useToast } from '@vambiant/ui';
import { trpc } from '@/lib/trpc';

export default function SettingsGeneralPage() {
  const { toast } = useToast();

  const { data: companiesList } = trpc.companies.list.useQuery();
  const currentCompanyId = companiesList?.[0]?.id;

  const { data: company, isLoading: companyLoading } = trpc.companies.getById.useQuery(
    { id: currentCompanyId! },
    { enabled: !!currentCompanyId },
  );

  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    companyName: '',
    street: '',
    postalCode: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    domain: '',
  });

  // Populate form when company data loads
  useEffect(() => {
    if (company) {
      const address = (company.address ?? {}) as Record<string, string>;
      const contact = (company.contact ?? {}) as Record<string, string>;
      setFormData({
        companyName: company.name ?? '',
        street: address.street ? `${address.street} ${address.streetNumber ?? ''}`.trim() : '',
        postalCode: address.zip ?? '',
        city: address.city ?? '',
        country: address.country ?? 'Deutschland',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        website: contact.website ?? '',
        taxId: company.taxId ?? '',
        domain: company.domain ?? '',
      });
    }
  }, [company]);

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      utils.companies.getById.invalidate({ id: currentCompanyId! });
      utils.companies.list.invalidate();
      toast({
        title: 'Einstellungen gespeichert',
        description: 'Die Unternehmensdaten wurden aktualisiert.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Fehler beim Speichern',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    // Parse street into street + streetNumber
    const streetParts = formData.street.match(/^(.+?)\s+(\d+\S*)$/);
    const streetName = streetParts ? streetParts[1] : formData.street;
    const streetNumber = streetParts ? streetParts[2] : undefined;

    updateMutation.mutate({
      name: formData.companyName,
      domain: formData.domain || undefined,
      taxId: formData.taxId || undefined,
      address: {
        street: streetName || undefined,
        streetNumber: streetNumber || undefined,
        zip: formData.postalCode || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
      },
      contact: {
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
      },
    });
  }

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Allgemeine Einstellungen
        </h1>
        <p className="text-muted-foreground">
          Verwalten Sie die grundlegenden Informationen Ihres Unternehmens
        </p>
      </div>

      {/* Company logo */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Unternehmenslogo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ihr Logo wird in Rechnungen, Berichten und im Dashboard angezeigt
        </p>
        <div className="mt-4 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed bg-muted/50">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              Logo hochladen
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              PNG, JPG oder SVG. Max. 2 MB.
            </p>
          </div>
        </div>
      </div>

      {/* Company info */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Unternehmensdaten</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Diese Daten werden für Rechnungen und offizielle Dokumente verwendet
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label
              htmlFor="companyName"
              className="text-sm font-medium leading-none"
            >
              Unternehmensname
            </label>
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label
              htmlFor="street"
              className="text-sm font-medium leading-none"
            >
              Straße und Hausnummer
            </label>
            <input
              id="street"
              type="text"
              value={formData.street}
              onChange={(e) => handleChange('street', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="postalCode"
              className="text-sm font-medium leading-none"
            >
              PLZ
            </label>
            <input
              id="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium leading-none">
              Stadt
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="country"
              className="text-sm font-medium leading-none"
            >
              Land
            </label>
            <input
              id="country"
              type="text"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium leading-none"
            >
              Telefon
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none"
            >
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="website"
              className="text-sm font-medium leading-none"
            >
              Website
            </label>
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="taxId"
              className="text-sm font-medium leading-none"
            >
              USt-IdNr.
            </label>
            <input
              id="taxId"
              type="text"
              value={formData.taxId}
              onChange={(e) => handleChange('taxId', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Domain settings */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Domain-Einstellungen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurieren Sie Ihre benutzerdefinierte Subdomain
        </p>
        <div className="mt-4 space-y-2">
          <label htmlFor="domain" className="text-sm font-medium leading-none">
            Subdomain
          </label>
          <div className="flex items-center gap-2">
            <input
              id="domain"
              type="text"
              value={formData.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              className="flex h-10 w-48 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              .vambiant.app
            </span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </button>
      </div>
    </div>
  );
}
