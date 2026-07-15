'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getApiUrl, STORAGE_KEY_URL } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Settings2, Link2, Key } from 'lucide-react';

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [backendInfo, setBackendInfo] = useState<string>('');

  useEffect(() => {
    setApiUrl(getApiUrl());
  }, []);

  async function saveUrl() {
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) return;
    localStorage.setItem(STORAGE_KEY_URL, url);
    toast.success('URL backend disimpan');
  }

  async function testConnection() {
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) { toast.error('Isi URL dulu'); return; }
    setStatus('checking');
    setBackendInfo('');
    try {
      const res = await fetch(`${url}/templates`);
      if (res.ok) {
        const data = await res.json();
        setStatus('ok');
        setBackendInfo(`✓ Terhubung — ${data.length} kategori template ditemukan`);
      } else {
        setStatus('error');
        setBackendInfo(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      setStatus('error');
      setBackendInfo(e.message);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-content center">
          <Settings2 size={18} className="text-white mx-auto" />
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

        {/* Status indicator */}
        {status !== 'idle' && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            status === 'ok' ? 'bg-green-50 text-green-700' :
            status === 'error' ? 'bg-red-50 text-red-600' :
            'bg-blue-50 text-blue-600'
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
          <Button onClick={saveUrl} size="sm">
            Simpan URL
          </Button>
        </div>
      </div>

      {/* Info section */}
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
