'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Book,
  Box,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock,
  FileBarChart,
  FileCheck,
  FileText,
  Folder,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Search,
  Settings,
  Store,
  Award,
  Users,
} from 'lucide-react';
import { cn } from '@vambiant/ui';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Übersicht', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projekte', href: '/projects', icon: Folder },
  { label: 'CRM', href: '/crm', icon: Users },
  { label: 'Kostenplanung', href: '/costs', icon: Calculator },
  { label: 'HOAI/Angebote', href: '/hoai', icon: FileText },
  { label: 'AVA', href: '/ava', icon: Clipboard },
  { label: 'Verträge', href: '/contracts', icon: FileCheck },
  { label: 'Rechnungen', href: '/invoices', icon: Receipt },
  { label: 'Zeiterfassung', href: '/time-tracking', icon: Clock },
  { label: 'Ressourcen', href: '/resources', icon: BarChart3 },
  { label: 'BIM', href: '/bim', icon: Box },
  { label: 'Kommunikation', href: '/communication', icon: MessageSquare },
  { label: 'Berichte', href: '/reports', icon: FileBarChart },
  { label: 'Ausschreibungen', href: '/tenders', icon: Search },
  { label: 'Wiki', href: '/wiki', icon: Book },
  { label: 'Marktplatz', href: '/marketplace', icon: Store },
  { label: 'Referenzen', href: '/references', icon: Award },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {collapsed ? (
          <div className="flex w-full justify-center">
            <span className="text-xl font-bold text-primary">V</span>
          </div>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">VambiantOS</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-2',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings + Collapse */}
      <div className="border-t px-2 py-3">
        <Link
          href="/settings/general"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            pathname.startsWith('/settings') &&
              'bg-sidebar-accent text-sidebar-accent-foreground',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Einstellungen' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Einstellungen</span>}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Seitenleiste erweitern' : 'Seitenleiste einklappen'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Einklappen</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
