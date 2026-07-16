'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getApiUrl, STORAGE_KEY_URL } from '@/lib/api';
import {
  CheckCircle, XCircle, Loader2, Settings2, Link2,
  CreditCard, Plus, Trash2, Key, Truck
} from 'lucide-react';

interface BankAccount {
  id?: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
}

const BANK_OPTIONS = ['BCA','BRI','BNI','Mandiri','BSI','DANA','OVO','GoPay','ShopeePay'];

export default function SettingsPage() {
  // URL
  const [apiUrl, setApiUrl] = useState('');
  const [connStatus, setConnStatus] = useState<'idle'|'checking'|'ok'|'error'>('idle');
  const [connInfo, setConnInfo] = useState('');

  // App config
  const [config, setConfig] = useState<Record<string,string>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Bank accounts
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState<BankAccount>({ bank_name: 'BCA', account_number: '', account_holder: '', is_active: true });
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    setApiUrl(getApiUrl());
    loadConfig();
    loadAccounts();
  }, []);

  async function loadConfig() {
    try {
      const res = await api.get('/config');
      setConfig(res.data);
    } catch {}
  }

  async function loadAccounts() {
    try {
      const res = await api.get('/bank-accounts');
      setAccounts(res.data);
    } catch {}
  }

  async function testConnection() {
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) { toast.error('Isi URL dulu'); return; }
    setConnStatus('checking'); setConnInfo('');
    try {
      const res = await fetch(`${url}/templates`);
      if (res.ok) {
        const data = await res.json();
        setConnStatus('ok');
        setConnInfo(`✓ Terhubung — ${data.length} kategori template`);
      } else { setConnStatus('error'); setConnInfo(`HTTP ${res.status}`); }
    } catch (e: any) { setConnStatus('error'); setConnInfo(e.message); }
  }

  async function saveUrl() {
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) return;
    localStorage.setItem(STORAGE_KEY_URL, url);
    toast.success('URL backend disimpan');
  }

  async function saveConfig() {
    setSavingConfig(true);
    try {
      await api.put('/config', config);
      toast.success('Konfigurasi disimpan — keyboard perlu Sync untuk update');
    } catch { toast.error('Gagal menyimpan'); }
    setSavingConfig(false);
  }

  async function addAccount() {
    if (!form.account_number || !form.account_holder) { toast.error('Isi semua field rekening'); return; }
    setSavingBank(true);
    try {
      await api.post('/bank-accounts', form);
      toast.success('Rekening ditambahkan');
      setForm({ bank_name: 'BCA', account_number: '', account_holder: '', is_active: true });
      loadAccounts();
    } catch { toast.error('Gagal menyimpan'); }
    setSavingBank(false);
  }

  async function deleteAccount(id: number) {
    try { await api.delete(`/bank-accounts/${id}`); toast.success('Dihapus'); loadAccounts(); }
    catch { toast.error('Gagal menghapus'); }
  }

  async function toggleActive(acc: BankAccount) {
    try { await api.put(`/bank-accounts/${acc.id}`, { ...acc, is_active: !acc.is_active }); loadAccounts(); }
    catch { toast.error('Gagal update'); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Settings2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-sm text-gray-400">Konfigurasi koneksi, API, & rekening</p>
        </div>
      </div>

      {/* ── URL Backend ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Link2 size={15} className="text-blue-500" /> URL Backend API
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          URL Cloudflare Tunnel aktif. Ganti jika tunnel restart.
        </p>
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">API URL</Label>
          <Input value={apiUrl} onChange={e => { setApiUrl(e.target.value); setConnStatus('idle'); }}
            placeholder="https://xxx.trycloudflare.com" className="font-mono text-sm" />
        </div>
        {connStatus !== 'idle' && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            connStatus === 'ok' ? 'bg-green-50 text-green-700' :
            connStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            {connStatus === 'checking' && <Loader2 size={14} className="animate-spin" />}
            {connStatus === 'ok' && <CheckCircle size={14} />}
            {connStatus === 'error' && <XCircle size={14} />}
            {connInfo || 'Mengecek...'}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={testConnection} variant="outline" size="sm" disabled={connStatus === 'checking'}>
            {connStatus === 'checking' && <Loader2 size={13} className="mr-1 animate-spin" />}
            Test Koneksi
          </Button>
          <Button onClick={saveUrl} size="sm">Simpan URL</Button>
        </div>
      </div>

      {/* ── Konfigurasi Aplikasi ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Key size={15} className="text-purple-500" /> Konfigurasi Aplikasi
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          Disimpan di server. Keyboard akan ambil saat Sync.
        </p>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Biteship API Key (Cek Ongkir)</Label>
            <Input
              value={config.biteship_key || ''}
              onChange={e => setConfig(c => ({ ...c, biteship_key: e.target.value }))}
              placeholder="biteship_live.eyJ..."
              type="password"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Dapatkan di dashboard.biteship.com → API Keys</p>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Nama Toko / Brand</Label>
            <Input
              value={config.store_name || ''}
              onChange={e => setConfig(c => ({ ...c, store_name: e.target.value }))}
              placeholder="Toko SAMAQU"
              className="text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Muncul di header invoice yang digenerate keyboard</p>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Pesan Penutup Invoice</Label>
            <Input
              value={config.invoice_footer || ''}
              onChange={e => setConfig(c => ({ ...c, invoice_footer: e.target.value }))}
              placeholder="Terima kasih sudah berbelanja! 🙏"
              className="text-sm"
            />
          </div>
        </div>

        <Button onClick={saveConfig} size="sm" disabled={savingConfig} className="gap-1">
          {savingConfig ? <Loader2 size={13} className="animate-spin" /> : null}
          Simpan Konfigurasi
        </Button>
      </div>

      {/* ── Rekening Transfer ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <CreditCard size={15} className="text-blue-500" /> Rekening Transfer
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          Tap bank di keyboard → auto-isi nomor & nama rekening.
        </p>

        {/* Form tambah */}
        <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tambah Rekening</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Bank</Label>
              <select value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">
                {BANK_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">No. Rekening</Label>
              <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                placeholder="1234567890" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Nama A/N</Label>
              <Input value={form.account_holder} onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))}
                placeholder="Nama Pemilik" className="text-sm" />
            </div>
          </div>
          <Button onClick={addAccount} size="sm" disabled={savingBank} className="gap-1">
            {savingBank ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Tambah
          </Button>
        </div>

        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada rekening.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map(acc => (
              <div key={acc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                acc.is_active ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="w-14 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                  {acc.bank_name}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{acc.account_number}</div>
                  <div className="text-xs text-gray-500">a.n. {acc.account_holder}</div>
                </div>
                <button onClick={() => toggleActive(acc)}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${acc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
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
        <div className="text-sm font-semibold text-amber-800">💡 Info</div>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Setelah simpan konfigurasi/rekening, keyboard perlu tap <strong>Sync</strong> untuk update</li>
          <li>URL backend simpan di browser ini saja — tidak disimpan ke server</li>
          <li>Biteship key disimpan terenkripsi di server, tidak perlu isi ulang di setiap HP</li>
        </ul>
      </div>
    </div>
  );
}
