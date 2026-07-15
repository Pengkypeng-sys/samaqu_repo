'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { STORAGE_KEY_URL, getApiUrl } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  useEffect(() => {
    const url = getApiUrl();
    setApiUrl(url);
    setShowUrl(!url);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const url = apiUrl.trim().replace(/\/$/, '');
    if (!url) { toast.error('Isi URL Backend dulu'); setShowUrl(true); return; }
    localStorage.setItem(STORAGE_KEY_URL, url);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await login(fd.get('email') as string, fd.get('password') as string);
      router.push('/orders');
    } catch {
      toast.error('Email atau password salah');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white font-black text-lg">SQ</span>
          </div>
          <CardTitle className="text-2xl">SAMAQU</CardTitle>
          <p className="text-sm text-muted-foreground">Login sebagai CS / Admin</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {showUrl ? (
              <div className="space-y-1">
                <Label htmlFor="apiUrl">URL Backend</Label>
                <Input
                  id="apiUrl"
                  type="url"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="https://xxx.trycloudflare.com"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400">URL Cloudflare Tunnel yang aktif</p>
              </div>
            ) : (
              <button type="button" onClick={() => setShowUrl(true)}
                className="text-xs text-blue-500 hover:underline w-full text-left">
                🔗 {apiUrl.replace('https://', '')} · Ganti URL
              </button>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus={!!apiUrl} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
