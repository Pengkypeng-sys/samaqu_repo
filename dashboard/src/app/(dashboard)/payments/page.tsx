'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState } from 'react';
import Image from 'next/image';

function VerifyDialog({ payment, onClose }: { payment: any; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const qc = useQueryClient();

  const verify = useMutation({
    mutationFn: ({ approved }: { approved: boolean }) =>
      api.patch(`/payments/${payment.id}/verify`, { approved, notes }),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'Pembayaran diverifikasi' : 'Pembayaran ditolak');
      qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: () => toast.error('Gagal memproses verifikasi'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Verifikasi Bukti Bayar — Order #{payment.order?.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Customer: <span className="text-foreground font-medium">{payment.order?.customer_name}</span>
            {' · '}Total: <span className="text-foreground font-medium">
              Rp {Number(payment.order?.total_price).toLocaleString('id-ID')}
            </span>
          </div>
          <div className="relative h-64 rounded-md overflow-hidden border bg-gray-50">
            <Image src={payment.proof_image_url} alt="Bukti bayar" fill className="object-contain" />
          </div>
          <Textarea placeholder="Catatan (opsional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => verify.mutate({ approved: true })} disabled={verify.isPending}>
              Verifikasi
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => verify.mutate({ approved: false })} disabled={verify.isPending}>
              Tolak
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const [selected, setSelected] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'menunggu_verifikasi'],
    queryFn: () => api.get('/orders', { params: { status: 'menunggu_verifikasi' } }).then(r => r.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Verifikasi Pembayaran</h1>
        <Badge variant="outline">{orders.length} menunggu</Badge>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Upload</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>}
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id}</TableCell>
                <TableCell>{o.customer_name}</TableCell>
                <TableCell>Rp {Number(o.total_price).toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {o.updated_at ? new Date(o.updated_at).toLocaleString('id-ID') : '-'}
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => setSelected(o)}>Periksa</Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && orders.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada pembayaran menunggu verifikasi</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <VerifyDialog
          payment={{ ...selected, proof_image_url: selected.payments?.[0]?.proof_image_url, id: selected.payments?.[0]?.id, order: selected }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
