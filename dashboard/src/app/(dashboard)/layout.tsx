'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isLoggedIn, logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, FileText, Package, CreditCard,
  BarChart2, LogOut, Zap,
} from 'lucide-react';

const nav = [
  { href: '/orders',    label: 'Order',      icon: ShoppingCart, color: 'text-blue-400' },
  { href: '/payments',  label: 'Pembayaran', icon: CreditCard,   color: 'text-green-400' },
  { href: '/templates', label: 'Template',   icon: FileText,     color: 'text-purple-400' },
  { href: '/products',  label: 'Produk',     icon: Package,      color: 'text-orange-400' },
  { href: '/reports',   label: 'Laporan',    icon: BarChart2,    color: 'text-pink-400' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-gray-900" />
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-widest">SAMAQU</div>
              <div className="text-xs text-gray-500">CS Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon, color }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-amber-400 text-gray-900 shadow-lg shadow-amber-400/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )}
              >
                <Icon size={16} className={active ? 'text-gray-900' : color} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-800 hover:text-red-400 transition-all"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-950">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
