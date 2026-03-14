'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Search } from 'lucide-react';
import { Breadcrumb } from './breadcrumb';
import { CompanySwitcher } from './company-switcher';
import { UserMenu } from './user-menu';

export function Header() {
  const [notificationCount] = useState(3);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      // TODO: Open command palette
      console.log('Open command palette');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-4">
        <Breadcrumb />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          type="button"
          onClick={() => {
            // TODO: Open command palette
            console.log('Open command palette');
          }}
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline-block">Suchen...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>

        {/* Company switcher */}
        <CompanySwitcher />

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            // TODO: Open notifications panel
            console.log('Open notifications');
          }}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
