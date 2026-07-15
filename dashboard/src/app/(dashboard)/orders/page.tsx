'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Copy, ShoppingCart, Clock, CheckCircle, TrendingUp } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft:                  'bg-gray-100 text-gray-600',
  pending:                'bg-yellow-100 text-yellow-700',
  menunggu_pembayaran:    'bg-yellow-100 text-yellow-700',
  menunggu_verifikasi:    'bg-blue-100 text-blue-700',
  diproses:               'bg-purple-100 text-purple-700',
  dikirim:                'bg-indigo-100 text-indigo-700',
  selesai:                'bg-green-100 text-green-700',
  dibatalkan:             'bg-red-100 text-red-700',
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function copyPaymentLink(token: string) {
  const url = `${window.location.origin}/bayar/${token}`;
  navigator.clipboard.writeText(url);
  toast.success('Link pembayaran disalin');
}

function CreateOrderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([{ product_id: '', size: '', qty: 1 }]);
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (body: any) => api.post('/orders', body),
    onSuccess: () => { toast.success('Order dibuat'); setOpen(false); qc.invalidateQueries({ queryKey: ['orders'] }); onCreated(); },
    onError: () => toast.error('Gagal membuat order'),
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      customer_name: fd.get('customer_name'),
      wa_number_or_ig: fd.get('wa_number_or_ig'),
      items: items.map(it => ({ product_id: +it.product_id, size: it.size || undefined, qty: it.qty })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <Plus size={14} className="mr-1" /> Order Baru
        </Button>
      } />
      <DialogContent className="max-w-lg bg-white border-gray-200 text-gray-900">
        <DialogHeader><DialogTitle className="text-gray-900">Buat Order Baru</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-700">Nama Customer</Label>
              <Input name="customer_name" required className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-700">No. WA / IG</Label>
              <Input name="wa_number_or_ig" required className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Produk</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Select value={item.product_id} onValueChange={(v: string | null) => setItems(it => it.map((x, j) => j === i ? { ...x, product_id: v ?? '' } : x))}>
                  <SelectTrigger className="flex-1 bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {products?.map((p: any) => <SelectItem key={p.id} value={String(p.id)} className="text-gray-900">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Size" className="w-16 bg-white border-gray-300 text-gray-900" value={item.size}
                  onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} />
                <Input type="number" min={1} className="w-16 bg-white border-gray-300 text-gray-900" value={item.qty}
                  onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={() => setItems(it => [...it, { product_id: '', size: '', qty: 1 }])}>
              + Tambah Produk
            </Button>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={create.isPending}>
            Buat Order
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => api.get('/orders', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
  });

  const pending  = orders.filter((o: any) => o.status === 'pending' || o.status === 'menunggu_pembayaran').length;
  const selesai  = orders.filter((o: any) => o.status === 'selesai').length;
  const revenue  = orders.filter((o: any) => o.status === 'selesai').reduce((s: number, o: any) => s + Number(o.total_price), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola semua pesanan masuk</p>
        </div>
        <CreateOrderDialog onCreated={() => qc.invalidateQueries({ queryKey: ['orders'] })} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total Order"  value={orders.length} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Clock}        label="Pending"       value={pending}        color="bg-yellow-100 text-yellow-600" />
        <StatCard icon={CheckCircle}  label="Selesai"       value={selesai}        color="bg-green-100 text-green-600" />
        <StatCard icon={TrendingUp}   label="Pendapatan"    value={`Rp ${revenue.toLocaleString('id-ID')}`} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Filter + Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-sm text-gray-500 font-medium">{orders.length} order ditemukan</span>
          <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? '')}>
            <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-700 text-sm">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="" className="text-gray-700">Semua</SelectItem>
              {['pending','menunggu_pembayaran','menunggu_verifikasi','diproses','dikirim','selesai','dibatalkan'].map(s => (
                <SelectItem key={s} value={s} className="text-gray-700">{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-gray-400">#</TableHead>
              <TableHead className="text-gray-400">Customer</TableHead>
              <TableHead className="text-gray-400">WA / IG</TableHead>
              <TableHead className="text-gray-400">Total</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">CS</TableHead>
              <TableHead className="text-gray-400">Tanggal</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">Memuat...</TableCell>
              </TableRow>
            )}
            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  Belum ada order. Tap <span className="text-blue-600 font-semibold">+ Order Baru</span> untuk mulai.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o: any) => (
              <TableRow key={o.id} className="border-gray-100 hover:bg-gray-50">
                <TableCell className="font-mono text-xs text-gray-400">{o.id}</TableCell>
                <TableCell className="text-gray-900 font-medium">{o.customer_name}</TableCell>
                <TableCell className="text-gray-500 text-sm">{o.wa_number_or_ig}</TableCell>
                <TableCell className="text-gray-900">Rp {Number(o.total_price).toLocaleString('id-ID')}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{o.cs?.name ?? '-'}</TableCell>
                <TableCell className="text-gray-400 text-xs">
                  {new Date(o.created_at).toLocaleDateString('id-ID')}
                </TableCell>
                <TableCell>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Salin link bayar" onClick={() => copyPaymentLink(o.payment_token)}>
                    <Copy size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
