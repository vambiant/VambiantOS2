'use client';

import { useState } from 'react';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@vambiant/ui';

interface Company {
  id: number;
  name: string;
  initials: string;
}

// TODO: Replace with real company data from tRPC query
const mockCompanies: Company[] = [
  { id: 1, name: 'Mustermann Architekten GmbH', initials: 'MA' },
  { id: 2, name: 'Beispiel Ingenieure AG', initials: 'BI' },
];

export function CompanySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(1);

  const selectedCompany = mockCompanies.find(
    (c) => c.id === selectedCompanyId,
  );

  function handleSelect(companyId: number) {
    setSelectedCompanyId(companyId);
    setIsOpen(false);
    // TODO: Switch company context via API
    console.log('Switching to company:', companyId);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[180px] truncate font-medium">
          {selectedCompany?.name ?? 'Unternehmen wählen'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
          />

          {/* Dropdown */}
          <div className="absolute left-0 z-50 mt-2 w-72 rounded-lg border bg-popover p-1 shadow-lg">
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Unternehmen
              </p>
            </div>

            {mockCompanies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company.id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary">
                  {company.initials}
                </div>
                <span className="flex-1 truncate text-left font-medium">
                  {company.name}
                </span>
                {company.id === selectedCompanyId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}

            <div className="border-t mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Open company creation dialog
                  console.log('Create company');
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed">
                  <Plus className="h-4 w-4" />
                </div>
                <span>Unternehmen erstellen</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
