'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isLoggedIn, logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, FileText, Package, CreditCard,
  BarChart2, LogOut, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const nav = [
  { href: '/orders',    label: 'Order',     icon: ShoppingCart },
  { href: '/payments',  label: 'Pembayaran', icon: CreditCard },
  { href: '/templates', label: 'Template',   icon: FileText },
  { href: '/products',  label: 'Produk',     icon: Package },
  { href: '/reports',   label: 'Laporan',    icon: BarChart2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b font-bold text-lg tracking-tight">SAMAQU</div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-gray-100',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground"
            onClick={logout}>
            <LogOut size={16} /> Keluar
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
