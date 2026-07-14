'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BayarPage() {
  const { token } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/bayar/${token}`)
      .then(r => setOrder(r.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [token]);

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await api.post(`/bayar/${token}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Bukti bayar berhasil dikirim! Tim kami akan segera memverifikasi.');
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gagal upload. Coba lagi.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-red-500">Order tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Order</CardTitle>
            <p className="text-sm text-muted-foreground">Halo, <strong>{order.customer_name}</strong>!</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {order.items?.map((it: any) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.product?.name}{it.size ? ` (${it.size})` : ''} ×{it.qty}</span>
                  <span>Rp {Number(it.price_at_order * it.qty).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>Rp {Number(order.total_price).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Status</span>
              <Badge variant="outline">{order.status.replace(/_/g, ' ')}</Badge>
            </div>
          </CardContent>
        </Card>

        {done ? (
          <Card>
            <CardContent className="py-6 text-center text-green-600 font-medium">
              Bukti bayar diterima. Tim kami akan memverifikasi segera.
            </CardContent>
          </Card>
        ) : order.status === 'menunggu_pembayaran' ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Bukti Pembayaran</CardTitle></CardHeader>
            <CardContent>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed rounded-md p-8 text-center text-sm text-muted-foreground hover:border-primary transition-colors">
                  {uploading ? 'Mengunggah...' : 'Klik untuk pilih foto bukti bayar (maks. 5MB)'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={uploadFile} disabled={uploading} />
              </label>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              {order.status === 'menunggu_verifikasi'
                ? 'Bukti bayar sudah dikirim. Menunggu verifikasi tim.'
                : 'Order ini tidak lagi menerima upload bukti bayar.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
