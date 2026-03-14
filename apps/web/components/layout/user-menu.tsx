'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function UserMenu() {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const user = auth.user
    ? {
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
        email: auth.user.email,
        initials: `${auth.user.firstName.charAt(0)}${auth.user.lastName.charAt(0)}`.toUpperCase(),
      }
    : {
        firstName: '',
        lastName: '',
        email: '',
        initials: '??',
      };

  async function handleLogout() {
    setIsOpen(false);
    await auth.logout();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {user.initials}
        </div>
        <span className="hidden font-medium md:inline-block">
          {user.firstName} {user.lastName}
        </span>
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
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-popover p-1 shadow-lg">
            {/* User info */}
            <div className="border-b px-3 py-3">
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/settings/general"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-4 w-4" />
                Profil
              </Link>
              <Link
                href="/settings/general"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                Einstellungen
              </Link>
            </div>

            <div className="border-t py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Abmelden
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
