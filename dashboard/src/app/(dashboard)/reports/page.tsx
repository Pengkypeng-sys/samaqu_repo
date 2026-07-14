'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

export default function ReportsPage() {
  const [range, setRange] = useState({ from: monthStart, to: today });
  const [query, setQuery] = useState(range);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', query],
    queryFn: () => api.get('/reports/summary', { params: query }).then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Laporan Penjualan</h1>

      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label>Dari</Label>
          <Input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Sampai</Label>
          <Input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
        </div>
        <Button onClick={() => setQuery(range)}>Tampilkan</Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Memuat...</p>}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">Total Order Selesai</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{data.total_orders}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">Rp {Number(data.revenue).toLocaleString('id-ID')}</p></CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CS</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.by_cs).map(([name, stat]: any) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{stat.count}</TableCell>
                    <TableCell>Rp {Number(stat.revenue).toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
