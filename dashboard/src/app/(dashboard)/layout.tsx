'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isLoggedIn, logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, FileText, Package, CreditCard,
  BarChart2, LogOut, Zap, Settings2,
} from 'lucide-react';

const nav = [
  { href: '/orders',    label: 'Order',      icon: ShoppingCart, bg: 'bg-blue-500',   iconColor: 'text-white' },
  { href: '/payments',  label: 'Pembayaran', icon: CreditCard,   bg: 'bg-emerald-500', iconColor: 'text-white' },
  { href: '/templates', label: 'Template',   icon: FileText,     bg: 'bg-violet-500', iconColor: 'text-white' },
  { href: '/products',  label: 'Produk',     icon: Package,      bg: 'bg-orange-500', iconColor: 'text-white' },
  { href: '/reports',   label: 'Laporan',    icon: BarChart2,    bg: 'bg-rose-500',   iconColor: 'text-white' },
  { href: '/settings',  label: 'Pengaturan', icon: Settings2,    bg: 'bg-slate-500',  iconColor: 'text-white' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm tracking-widest">SAMAQU</div>
              <div className="text-xs text-gray-400">CS Dashboard</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon, bg, iconColor }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-all',
                  active ? bg + ' shadow-md' : bg + ' opacity-80',
                )}>
                  <Icon size={14} className={iconColor} />
                </span>
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-700 text-xs font-medium">
          🚧 <span>Aplikasi masih dalam tahap pengembangan — fitur <strong>Pending</strong> dan <strong>Cek Ongkir</strong> belum aktif.</span>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
