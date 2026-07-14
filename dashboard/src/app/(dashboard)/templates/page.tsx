'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

function CategorySection({ cat, onEdit, onDelete }: { cat: any; onEdit: (t: any) => void; onDelete: (id: number) => void }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{cat.name}</h3>
      <div className="space-y-2">
        {cat.templates?.map((t: any) => (
          <div key={t.id} className="bg-white border rounded-md p-3 text-sm flex justify-between items-start gap-2">
            <pre className="whitespace-pre-wrap font-sans flex-1">{t.content}</pre>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onEdit(t)}><Pencil size={13} /></Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)}><Trash2 size={13} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [editTarget, setEditTarget] = useState<any>(null);
  const [newOpen, setNewOpen] = useState(false);
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/templates', body),
    onSuccess: () => { toast.success('Template ditambah'); setNewOpen(false); qc.invalidateQueries({ queryKey: ['templates'] }); },
  });

  const update = useMutation({
    mutationFn: ({ id, content }: any) => api.put(`/templates/${id}`, { content }),
    onSuccess: () => { toast.success('Template diperbarui'); setEditTarget(null); qc.invalidateQueries({ queryKey: ['templates'] }); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/templates/${id}`),
    onSuccess: () => { toast.success('Template dihapus'); qc.invalidateQueries({ queryKey: ['templates'] }); },
  });

  const createCategory = useMutation({
    mutationFn: (name: string) => api.post('/templates/categories', { name }),
    onSuccess: () => { toast.success('Kategori ditambah'); qc.invalidateQueries({ queryKey: ['templates'] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Script Template</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const name = prompt('Nama kategori baru:');
            if (name) createCategory.mutate(name);
          }}>
            + Kategori
          </Button>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger render={<Button size="sm"><Plus size={14} className="mr-1" /> Template</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Template Baru</DialogTitle></DialogHeader>
              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                create.mutate({ category_id: +fd.get('category_id')!, content: fd.get('content') });
              }} className="space-y-3">
                <div className="space-y-1">
                  <Label>Kategori</Label>
                  <select name="category_id" className="w-full border rounded-md px-3 py-2 text-sm" required>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Isi Template</Label>
                  <Textarea name="content" rows={6} required placeholder="Halo kak {nama}, ..." />
                </div>
                <Button type="submit" className="w-full" disabled={create.isPending}>Simpan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((cat: any) => (
          <CategorySection key={cat.id} cat={cat}
            onEdit={setEditTarget}
            onDelete={id => { if (confirm('Hapus template ini?')) remove.mutate(id); }}
          />
        ))}
      </div>

      {editTarget && (
        <Dialog open onOpenChange={() => setEditTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              update.mutate({ id: editTarget.id, content: fd.get('content') });
            }} className="space-y-3">
              <Textarea name="content" rows={8} defaultValue={editTarget.content} required />
              <Button type="submit" className="w-full" disabled={update.isPending}>Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
