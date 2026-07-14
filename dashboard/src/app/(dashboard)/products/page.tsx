'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

function ProductForm({ product, onSave, onClose }: { product?: any; onSave: (data: any) => void; onClose: () => void }) {
  return (
    <form onSubmit={e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      const sizeRaw = fd.get('size_variants') as string;
      let size_variants: any = undefined;
      if (sizeRaw.trim()) {
        try { size_variants = JSON.parse(sizeRaw); } catch { toast.error('Format size variants tidak valid (harus JSON)'); return; }
      }
      onSave({ name: fd.get('name'), series: fd.get('series'), price: +fd.get('price')!, stock_qty: +fd.get('stock_qty')!, size_variants });
    }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>Nama Produk</Label>
          <Input name="name" defaultValue={product?.name} required />
        </div>
        <div className="space-y-1">
          <Label>Series</Label>
          <Input name="series" defaultValue={product?.series} />
        </div>
        <div className="space-y-1">
          <Label>Harga (Rp)</Label>
          <Input name="price" type="number" defaultValue={product?.price} required />
        </div>
        <div className="space-y-1">
          <Label>Stok Total</Label>
          <Input name="stock_qty" type="number" defaultValue={product?.stock_qty ?? 0} required />
        </div>
        <div className="space-y-1">
          <Label>Size Variants (JSON)</Label>
          <Input name="size_variants" placeholder='{"S":10,"M":5}' defaultValue={product?.size_variants ? JSON.stringify(product.size_variants) : ''} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Simpan</Button>
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [newOpen, setNewOpen] = useState(false);
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get('/products', { params: search ? { search } : {} }).then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/products', body),
    onSuccess: () => { toast.success('Produk ditambah'); setNewOpen(false); qc.invalidateQueries({ queryKey: ['products'] }); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => api.put(`/products/${id}`, body),
    onSuccess: () => { toast.success('Produk diperbarui'); setEditTarget(null); qc.invalidateQueries({ queryKey: ['products'] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk & Stok</h1>
        <div className="flex gap-2">
          <Input placeholder="Cari produk..." className="w-52" value={search} onChange={e => setSearch(e.target.value)} />
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger render={<Button size="sm"><Plus size={14} className="mr-1" /> Produk</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Produk Baru</DialogTitle></DialogHeader>
              <ProductForm onSave={data => create.mutate(data)} onClose={() => setNewOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Series</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Sizes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.series ?? '-'}</TableCell>
                <TableCell>Rp {Number(p.price).toLocaleString('id-ID')}</TableCell>
                <TableCell>
                  <Badge variant={p.stock_qty < 5 ? 'destructive' : 'secondary'}>{p.stock_qty}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.size_variants ? Object.entries(p.size_variants).map(([k, v]) => `${k}:${v}`).join(', ') : '-'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditTarget(p)}><Pencil size={13} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editTarget && (
        <Dialog open onOpenChange={() => setEditTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Produk</DialogTitle></DialogHeader>
            <ProductForm product={editTarget} onSave={data => update.mutate({ id: editTarget.id, ...data })} onClose={() => setEditTarget(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
