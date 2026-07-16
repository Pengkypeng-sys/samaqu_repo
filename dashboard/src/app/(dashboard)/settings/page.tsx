'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getApiUrl, STORAGE_KEY_URL } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Settings2, Link2, CreditCard, Plus, Trash2 } from 'lucide-react';

interface BankAccount {
  id?: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
}

const BANK_OPTIONS = ['BCA','BRI','BNI','Mandiri','BSI','DANA','OVO','GoPay','ShopeePay'];

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [backendInfo, setBackendInfo] = useState<string>('');

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState<BankAccount>({ bank_name: 'BCA', account_number: '', account_holder: '', is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setApiUrl(getApiUrl());
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const res = await api.get('/bank-accounts');
      setAccounts(res.data);
    } catch {}
  }

  async function saveUrl() {
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) return;
    localStorage.setItem(STORAGE_KEY_URL, url);
    toast.success('URL backend disimpan');
  }

  async function testConnection() {
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) { toast.error('Isi URL dulu'); return; }
    setStatus('checking'); setBackendInfo('');
    try {
      const res = await fetch(`${url}/templates`);
      if (res.ok) {
        const data = await res.json();
        setStatus('ok');
        setBackendInfo(`✓ Terhubung — ${data.length} kategori template ditemukan`);
      } else {
        setStatus('error'); setBackendInfo(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      setStatus('error'); setBackendInfo(e.message);
    }
  }

  async function addAccount() {
    if (!form.account_number || !form.account_holder) { toast.error('Isi semua field rekening'); return; }
    setSaving(true);
    try {
      await api.post('/bank-accounts', form);
      toast.success('Rekening ditambahkan');
      setForm({ bank_name: 'BCA', account_number: '', account_holder: '', is_active: true });
      loadAccounts();
    } catch { toast.error('Gagal menyimpan'); }
    setSaving(false);
  }

  async function deleteAccount(id: number) {
    try {
      await api.delete(`/bank-accounts/${id}`);
      toast.success('Rekening dihapus');
      loadAccounts();
    } catch { toast.error('Gagal menghapus'); }
  }

  async function toggleActive(acc: BankAccount) {
    try {
      await api.put(`/bank-accounts/${acc.id}`, { ...acc, is_active: !acc.is_active });
      loadAccounts();
    } catch { toast.error('Gagal update'); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Settings2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-sm text-gray-400">Konfigurasi koneksi & sistem</p>
        </div>
      </div>

      {/* API URL */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Link2 size={15} className="text-blue-500" />
          URL Backend API
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          URL Cloudflare Tunnel yang aktif. Ganti jika tunnel restart dan URL berubah.
        </p>
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">API URL</Label>
          <Input
            value={apiUrl}
            onChange={e => { setApiUrl(e.target.value); setStatus('idle'); }}
            placeholder="https://xxx.trycloudflare.com"
            className="font-mono text-sm"
          />
        </div>
        {status !== 'idle' && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            status === 'ok' ? 'bg-green-50 text-green-700' :
            status === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {status === 'checking' && <Loader2 size={14} className="animate-spin" />}
            {status === 'ok' && <CheckCircle size={14} />}
            {status === 'error' && <XCircle size={14} />}
            {backendInfo || 'Mengecek koneksi...'}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={testConnection} variant="outline" size="sm" disabled={status === 'checking'}>
            {status === 'checking' ? <Loader2 size={13} className="mr-1 animate-spin" /> : null}
            Test Koneksi
          </Button>
          <Button onClick={saveUrl} size="sm">Simpan URL</Button>
        </div>
      </div>

      {/* Rekening / Transfer */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <CreditCard size={15} className="text-blue-500" />
          Rekening Transfer
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          Daftar rekening yang muncul di keyboard. Klik bank di keyboard → auto-isi nomor & nama.
        </p>

        {/* Tambah rekening */}
        <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tambah Rekening</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Bank</Label>
              <select
                value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
              >
                {BANK_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Nomor Rekening</Label>
              <Input
                value={form.account_number}
                onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                placeholder="1234567890"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Nama Pemilik</Label>
              <Input
                value={form.account_holder}
                onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))}
                placeholder="Nama A/N"
                className="text-sm"
              />
            </div>
          </div>
          <Button onClick={addAccount} size="sm" disabled={saving} className="gap-1">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Tambah
          </Button>
        </div>

        {/* Daftar rekening */}
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada rekening. Tambah di atas.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map(acc => (
              <div key={acc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${acc.is_active ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="w-12 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                  {acc.bank_name}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{acc.account_number}</div>
                  <div className="text-xs text-gray-500">{acc.account_holder}</div>
                </div>
                <button
                  onClick={() => toggleActive(acc)}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${acc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                >
                  {acc.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                <button onClick={() => deleteAccount(acc.id!)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-2">
        <div className="text-sm font-semibold text-amber-800">💡 Cara update URL backend</div>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
          <li>Di server Proxmox container 112, cek URL tunnel aktif</li>
          <li>Salin URL baru (format: <code className="bg-amber-100 px-1 rounded">xxx.trycloudflare.com</code>)</li>
          <li>Tempel di field di atas → Test Koneksi → Simpan URL</li>
          <li>Semua halaman dashboard & extension Chrome akan langsung pakai URL baru</li>
        </ol>
      </div>
    </div>
  );
}
