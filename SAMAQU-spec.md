# SAMAQU — Spec Teknis Sistem CS & Order Management

## 1. Ringkasan

Sistem bantu CS jualan online (WhatsApp & Instagram) tanpa pakai API resmi Meta. Terdiri dari 3 komponen utama:

1. **Keyboard app** (Android custom keyboard/IME) — bantu CS insert template, cek ongkir, invoice, upload bukti bayar, saat chat manual di WA/IG native
2. **Backend API** — pusat logika, data, dan integrasi pihak ketiga (ongkir, storage, notifikasi)
3. **Dashboard web** — kelola template, produk/stok, order, verifikasi pembayaran, laporan

**Prinsip desain penting**: TIDAK menggunakan WhatsApp Business API / Instagram Messaging API. CS tetap chat manual pakai akun WA/IG biasa. Konsekuensinya: sistem tidak bisa baca pesan masuk otomatis atau auto-reply — semua interaksi dengan customer tetap manual, sistem hanya mempercepat proses CS dan mengelola data di baliknya.

---

## 2. Tech stack

| Layer | Pilihan |
|---|---|
| Keyboard app | Kotlin, Android `InputMethodService` |
| Backend | Node.js (NestJS/Express) + TypeScript, REST API |
| Database | PostgreSQL |
| Dashboard | Next.js 14 (App Router) |
| Auth | JWT, role-based (admin / cs) |
| Storage bukti bayar | Cloudinary atau S3-compatible |
| Cek ongkir | Biteship atau RajaOngkir API |
| Notifikasi internal | In-app notification + Web Push + Telegram Bot API |
| Hosting | VPS + Nginx, atau Railway/Render untuk cepat deploy |

---

## 3. Skema database (PostgreSQL)

```sql
-- User & auth
users (
  id, name, email, password_hash,
  role ENUM('admin','cs'),
  api_key,               -- dipakai keyboard app untuk auth
  created_at
)

-- Script/template (pengganti Google Sheets)
categories (
  id, name              -- Sapaan Awal, Rekomendasi Size, Penjelasan Produk, dll
)

script_templates (
  id, category_id, content,
  created_by, updated_at
)

-- Produk & stok
products (
  id, name, series, price,
  stock_qty, size_variants JSONB
)

-- Order
orders (
  id, customer_name, wa_number_or_ig, cs_id,
  status ENUM('draft','menunggu_pembayaran','menunggu_verifikasi',
              'diproses','dikirim','selesai','dibatalkan'),
  payment_token UUID UNIQUE,   -- untuk link upload publik
  total_price, created_at
)

order_items (
  id, order_id, product_id, size, qty, price_at_order
)

-- Pembayaran (upload langsung oleh customer)
payments (
  id, order_id, proof_image_url, uploaded_at,
  status ENUM('menunggu_verifikasi','terverifikasi','ditolak'),
  verified_by_cs_id, verified_at, notes
)

-- Notifikasi internal
telegram_config (
  id, bot_token, chat_id_grup_tim, is_active
)

notifications (
  id, type ENUM('bukti_bayar_baru','stok_menipis','order_baru'),
  order_id NULLABLE, message,
  sent_via ENUM('in_app','web_push','telegram'),
  created_at
)
```

---

## 4. Endpoint API utama

| Method & path | Dipanggil dari | Fungsi |
|---|---|---|
| `POST /auth/login` | Keyboard app, dashboard | Login, dapat JWT |
| `GET /templates` | Keyboard app | Ambil daftar template (sync) |
| `POST /templates` `PUT /templates/:id` | Dashboard | CRUD template |
| `GET /products?search=` | Keyboard app, dashboard | Cari produk & cek stok |
| `POST /orders` | Keyboard app, dashboard | Buat order baru, generate `payment_token` |
| `GET /bayar/:token` | Public (customer, tanpa login) | Halaman ringkasan order + form upload |
| `POST /bayar/:token/upload` | Public (customer) | Upload bukti bayar, status jadi `menunggu_verifikasi` |
| `GET /orders?status=` | Dashboard | List order per status |
| `PATCH /payments/:id/verify` | Dashboard | CS verifikasi/tolak pembayaran |
| `GET /shipping/check` | Keyboard app | Cek ongkir via Biteship/RajaOngkir |
| `POST /notifications/telegram` | Internal (trigger backend) | Kirim alert ke grup Telegram tim |
| `GET /reports/*` | Dashboard | Laporan penjualan, performa CS |

---

## 5. Alur kerja kunci

### 5.1 CS balas chat pakai keyboard
CS buka WA/IG native → ganti keyboard ke SAMAQU keyboard → pilih kategori → pilih template → insert ke chat → kirim manual seperti biasa.

### 5.2 Order & pembayaran
1. CS input order baru (nama, produk, size) lewat keyboard/dashboard → sistem generate `payment_token` unik
2. CS kirim link `domain.com/bayar/{token}` ke customer via chat (template siap pakai)
3. Customer buka link (tanpa login), lihat ringkasan order, upload bukti bayar
4. Sistem simpan gambar, buat `payments` record status `menunggu_verifikasi`, order jadi `menunggu_verifikasi`
5. Notifikasi masuk ke dashboard (in-app + Web Push) dan grup Telegram tim
6. CS buka detail order, cek gambar, klik **Verifikasi** atau **Tolak**
   - Verifikasi → order jadi `diproses`, stok produk otomatis dikurangi (dalam 1 transaksi DB)
   - Tolak → order balik ke `menunggu_pembayaran`, bisa isi catatan alasan

### 5.3 Notifikasi internal (bukan ke customer)
Event: bukti bayar baru, stok menipis (<5), order baru → kirim ke:
- In-app notification (badge dashboard)
- Web Push (browser)
- Telegram bot ke grup internal tim CS

---

## 6. Yang sengaja TIDAK dibangun (out of scope MVP)

- Auto-reply / chatbot (butuh WA/IG API resmi — di luar keputusan project ini)
- Baca pesan masuk otomatis dari WA/IG
- OCR otomatis baca nominal di bukti bayar (verifikasi tetap manual oleh CS)
- Native mobile app untuk dashboard (dashboard tetap web di awal, PWA/React Native bisa menyusul kalau dibutuhkan)

---

## 7. Roadmap bertahap

1. **MVP**: backend + database + dashboard (script manager saja, ganti Google Sheets) + keyboard app (template picker saja)
2. **Fase 2**: order tracking + halaman upload bukti bayar publik + verifikasi CS + Telegram bot notifikasi
3. **Fase 3**: cek ongkir + invoice generator dari keyboard
4. **Fase 4**: laporan penjualan lengkap + Web Push notification

---

## 8. Catatan tambahan untuk implementasi

- `payment_token` harus UUID random, tidak boleh sequential/predictable (keamanan — orang lain tidak bisa tebak link order lain)
- Update stok saat verifikasi pembayaran harus dalam satu database transaction untuk hindari race condition (dua CS verifikasi order untuk produk stok tipis di waktu bersamaan)
- Keyboard app cache template terakhir secara lokal (Room database) untuk tetap bisa jalan saat koneksi CS terputus
- Telegram bot token & chat ID disimpan di environment variable backend, bukan hardcode
