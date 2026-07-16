# Samaqu — Project Context

Aplikasi keyboard kustom untuk CS/penjual online (mirip Selly Keyboard), dengan
dashboard admin dan backend terpusat. Target akhir: Android, iOS, Windows.

## Arsitektur

```
                    ┌──────────────────────────────┐
                    │  Backend (NestJS)              │
                    │  Proxmox container 112         │
                    │  systemd service                │
                    │  Exposed: Cloudflare Tunnel     │
                    │  (trycloudflare.com)            │
                    └───────────┬────────────────────┘
                                │ REST API
              ┌─────────────────┼─────────────────┐
       ┌──────▼──────┐   ┌──────▼──────┐   ┌───────▼───────┐
       │  Dashboard   │   │   Android    │   │  iOS (belum)  │
       │  Next.js     │   │   Keyboard   │   │  Windows      │
       │  di Vercel   │   │   (APK/IME)  │   │  (belum)      │
       └──────────────┘   └──────────────┘   └───────────────┘
```

## Status saat ini

### Backend — NestJS (Proxmox container 112)
- [x] Auth JWT — login, register, role (admin/cs)
- [x] CRUD Orders — create, update status, list
- [x] CRUD Templates — kategori + isi pesan
- [x] CRUD Products — stok, harga, varian ukuran
- [x] `GET /templates` publik (tanpa auth) — dipakai keyboard untuk sync
- [x] Deploy: `git pull` manual di container, dijalankan via systemd
- [x] Exposed via Cloudflare Tunnel (trycloudflare.com — URL sementara/dinamis)

**Catatan arsitektur:** endpoint publik `GET /templates` sengaja tanpa auth
supaya keyboard bisa sync tanpa login duluan. Endpoint write (POST/PUT/DELETE)
untuk templates **seharusnya** tetap butuh JWT + role guard — ini yang belum
ada (lihat prioritas di bawah).

### Dashboard — Next.js (Vercel)
- [x] Halaman Login
- [x] Halaman Orders — list + update status
- [x] Halaman Templates — buat kategori + template pesan
- [x] Halaman Products — kelola produk & stok
- [x] Koneksi ke backend via `NEXT_PUBLIC_API_URL`

### Android Keyboard (APK, install manual via ADB)
- [x] Full IME (`InputMethodService`) — pengganti keyboard native, seperti Selly
- [x] Toolbar biru di atas keyboard: Auto Text, Sync, Switch Keyboard
- [x] QWERTY keyboard custom (a-z, shift, backspace, enter, spasi)
- [x] Panel Auto Text — tap → daftar template → tap item → `commitText`
      langsung ke field aktif (tanpa clipboard)
- [x] Sync — fetch template terbaru dari backend
- [x] Switch Keyboard — kembali ke Gboard kapan saja
- [x] Template tersimpan lokal (Room DB) — bisa dipakai offline

### iOS Keyboard Extension
- [ ] Belum mulai

### Windows App (tray + hotkey)
- [ ] Belum mulai

## Prioritas perbaikan (urut dari paling kritis)

1. **[SECURITY — kerjakan duluan]** Tambah guard (JWT + role check) di endpoint
   write backend: `POST/PUT/DELETE /templates`, `/products`, `/orders`.
   Saat ini kemungkinan siapa saja yang tahu URL tunnel bisa ubah/hapus data.
   - Pastikan `GET /templates` tetap publik (dipakai keyboard tanpa login),
     tapi semua endpoint mutasi wajib `@UseGuards(JwtAuthGuard, RolesGuard)`.
2. Keyboard angka/simbol — layout QWERTY saat ini belum ada mode angka/simbol.
3. Rapikan tampilan panel Auto Text (UI/UX pass).
4. Notifikasi order masuk di HP CS (push notification / polling backend).

## Rencana ke depan (belum dikerjakan, untuk konteks arah proyek)

- Ganti Cloudflare Tunnel sementara (trycloudflare.com) dengan domain tetap
  atau tunnel permanen, supaya URL backend tidak berubah-ubah tiap restart.
- iOS: Keyboard Extension native (Swift) — App Groups untuk share data dengan
  companion app, minta "Allow Full Access" untuk akses network.
- Windows: tray app + global hotkey, inject teks via `SendInput`/UI Automation
  ke aplikasi aktif (mis. WhatsApp Desktop).
- Pertimbangkan Kotlin Multiplatform untuk share business logic (model data,
  network layer, sync) antara Android dan (nanti) companion iOS/Windows.

## Tech stack referensi

| Layer | Teknologi |
|---|---|
| Backend | NestJS, deploy manual via git pull + systemd, Proxmox container |
| Tunnel | Cloudflare Tunnel (trycloudflare.com) |
| Dashboard | Next.js, Vercel |
| Android | Native Kotlin, `InputMethodService`, Room DB |
| iOS (rencana) | Native Swift, Keyboard Extension, App Groups |
| Windows (rencana) | .NET / tray app + global hotkey |
