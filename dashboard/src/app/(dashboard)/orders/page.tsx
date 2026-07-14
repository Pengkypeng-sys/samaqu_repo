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
import { Plus, Copy } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'secondary',
  menunggu_pembayaran: 'outline',
  menunggu_verifikasi: 'default',
  diproses: 'default',
  dikirim: 'default',
  selesai: 'default',
  dibatalkan: 'destructive',
};

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
      <DialogTrigger render={<Button size="sm"><Plus size={14} className="mr-1" /> Order Baru</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Buat Order Baru</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nama Customer</Label>
              <Input name="customer_name" required />
            </div>
            <div className="space-y-1">
              <Label>No. WA / IG</Label>
              <Input name="wa_number_or_ig" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Produk</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Select value={item.product_id} onValueChange={(v: string | null) => setItems(it => it.map((x, j) => j === i ? { ...x, product_id: v ?? '' } : x))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>
                    {products?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Size" className="w-16" value={item.size}
                  onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} />
                <Input type="number" min={1} className="w-16" value={item.qty}
                  onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setItems(it => [...it, { product_id: '', size: '', qty: 1 }])}>
              + Tambah Produk
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>Buat Order</Button>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? '')}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Semua status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua</SelectItem>
              {['menunggu_pembayaran','menunggu_verifikasi','diproses','dikirim','selesai','dibatalkan'].map(s => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CreateOrderDialog onCreated={() => qc.invalidateQueries({ queryKey: ['orders'] })} />
        </div>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>WA / IG</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CS</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>}
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id}</TableCell>
                <TableCell>{o.customer_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.wa_number_or_ig}</TableCell>
                <TableCell>Rp {Number(o.total_price).toLocaleString('id-ID')}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[o.status] as any}>{o.status.replace(/_/g, ' ')}</Badge>
                </TableCell>
                <TableCell className="text-sm">{o.cs?.name ?? '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString('id-ID')}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" title="Salin link bayar"
                    onClick={() => copyPaymentLink(o.payment_token)}>
                    <Copy size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
