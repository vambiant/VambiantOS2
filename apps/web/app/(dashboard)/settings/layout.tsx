'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CreditCard, Shield, Users } from 'lucide-react';
import { cn } from '@vambiant/ui';
import type { ReactNode } from 'react';

const settingsNav = [
  {
    label: 'Allgemein',
    href: '/settings/general',
    icon: Building2,
  },
  {
    label: 'Mitglieder',
    href: '/settings/members',
    icon: Users,
  },
  {
    label: 'Rollen',
    href: '/settings/roles',
    icon: Shield,
  },
  {
    label: 'Abrechnung',
    href: '/settings/billing',
    icon: CreditCard,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
