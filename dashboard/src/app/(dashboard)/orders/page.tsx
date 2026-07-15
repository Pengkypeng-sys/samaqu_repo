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
  draft: 'bg-gray-700 text-gray-300',
  pending: 'bg-yellow-900 text-yellow-300',
  menunggu_pembayaran: 'bg-yellow-900 text-yellow-300',
  menunggu_verifikasi: 'bg-blue-900 text-blue-300',
  diproses: 'bg-purple-900 text-purple-300',
  dikirim: 'bg-indigo-900 text-indigo-300',
  selesai: 'bg-green-900 text-green-300',
  dibatalkan: 'bg-red-900 text-red-300',
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
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
        <Button size="sm" className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold">
          <Plus size={14} className="mr-1" /> Order Baru
        </Button>
      } />
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700 text-white">
        <DialogHeader><DialogTitle className="text-white">Buat Order Baru</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-400">Nama Customer</Label>
              <Input name="customer_name" required className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400">No. WA / IG</Label>
              <Input name="wa_number_or_ig" required className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Produk</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Select value={item.product_id} onValueChange={(v: string | null) => setItems(it => it.map((x, j) => j === i ? { ...x, product_id: v ?? '' } : x))}>
                  <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {products?.map((p: any) => <SelectItem key={p.id} value={String(p.id)} className="text-white">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Size" className="w-16 bg-gray-800 border-gray-700 text-white" value={item.size}
                  onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} />
                <Input type="number" min={1} className="w-16 bg-gray-800 border-gray-700 text-white" value={item.qty}
                  onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:bg-gray-800"
              onClick={() => setItems(it => [...it, { product_id: '', size: '', qty: 1 }])}>
              + Tambah Produk
            </Button>
          </div>
          <Button type="submit" className="w-full bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold" disabled={create.isPending}>
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
          <h1 className="text-2xl font-bold text-white">Order</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola semua pesanan masuk</p>
        </div>
        <CreateOrderDialog onCreated={() => qc.invalidateQueries({ queryKey: ['orders'] })} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total Order"  value={orders.length} color="bg-blue-900 text-blue-400" />
        <StatCard icon={Clock}        label="Pending"       value={pending}        color="bg-yellow-900 text-yellow-400" />
        <StatCard icon={CheckCircle}  label="Selesai"       value={selesai}        color="bg-green-900 text-green-400" />
        <StatCard icon={TrendingUp}   label="Pendapatan"    value={`Rp ${revenue.toLocaleString('id-ID')}`} color="bg-purple-900 text-purple-400" />
      </div>

      {/* Filter + Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <span className="text-sm text-gray-400 font-medium">{orders.length} order ditemukan</span>
          <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? '')}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white text-sm">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="" className="text-white">Semua</SelectItem>
              {['pending','menunggu_pembayaran','menunggu_verifikasi','diproses','dikirim','selesai','dibatalkan'].map(s => (
                <SelectItem key={s} value={s} className="text-white">{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-500">#</TableHead>
              <TableHead className="text-gray-500">Customer</TableHead>
              <TableHead className="text-gray-500">WA / IG</TableHead>
              <TableHead className="text-gray-500">Total</TableHead>
              <TableHead className="text-gray-500">Status</TableHead>
              <TableHead className="text-gray-500">CS</TableHead>
              <TableHead className="text-gray-500">Tanggal</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-600">Memuat...</TableCell>
              </TableRow>
            )}
            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-600">
                  Belum ada order. Tap <span className="text-amber-400 font-semibold">+ Order Baru</span> untuk mulai.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o: any) => (
              <TableRow key={o.id} className="border-gray-800 hover:bg-gray-800/50">
                <TableCell className="font-mono text-xs text-gray-500">{o.id}</TableCell>
                <TableCell className="text-white font-medium">{o.customer_name}</TableCell>
                <TableCell className="text-gray-400 text-sm">{o.wa_number_or_ig}</TableCell>
                <TableCell className="text-white">Rp {Number(o.total_price).toLocaleString('id-ID')}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-700 text-gray-300'}`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-gray-400 text-sm">{o.cs?.name ?? '-'}</TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {new Date(o.created_at).toLocaleDateString('id-ID')}
                </TableCell>
                <TableCell>
                  <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-amber-400 transition-colors"
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
