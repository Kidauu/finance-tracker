# Runbook: Scan Struk Lokal di iPhone dengan Gemma 4 E2B

Dokumen ini adalah rencana eksekusi fitur **Scan Struk** untuk Finance Tracker.

Targetnya sederhana: pengguna mengambil atau memilih foto struk di iPhone, AI membaca struk **di perangkat**, lalu aplikasi menampilkan draft transaksi yang masih dapat diperiksa dan diedit sebelum disimpan ke Supabase.

## Target dan batasan

### Yang akan dibuat

```text
Foto struk
  → gambar diperkecil dan diperjelas di iPhone
  → Gemma 4 E2B membaca gambar secara lokal
  → AI menghasilkan draft terstruktur
  → pengguna memeriksa dan mengubah bila perlu
  → pengguna menekan Simpan
  → transaksi tersimpan ke Supabase
```

Contoh hasil draft:

```json
{
  "merchant": "Kopi Kenangan",
  "transaction_date": "2026-10-26",
  "amount": 45000,
  "type": "expense",
  "suggested_category": "Kopi",
  "confidence": {
    "merchant": "high",
    "date": "medium",
    "amount": "high"
  }
}
```

### Yang tidak akan dilakukan AI

- Tidak boleh menyimpan, mengubah, atau menghapus transaksi secara otomatis.
- Tidak boleh menghitung saldo rekening sebagai sumber kebenaran.
- Tidak boleh mengeksekusi SQL atau mendapat akses Supabase service-role key.
- Tidak boleh memutuskan rekening pembayaran. Pengguna memilih rekening (Cash, BCA, atau SeaBank) pada layar konfirmasi.

Kode aplikasi tetap memvalidasi nominal, tanggal, kategori, dan rekening. AI hanya membuat **draft**.

### Definisi “fully local” di fitur ini

Model AI dan foto struk diproses di iPhone. Foto tidak dikirim ke layanan AI/cloud.

Supabase tetap diperlukan untuk login dan menyimpan transaksi yang telah dikonfirmasi. Jadi fitur ini bukan mode aplikasi yang sepenuhnya offline.

## Keputusan teknis awal

| Area | Keputusan awal |
| --- | --- |
| Model | Gemma 4 E2B instruction-tuned, quantized dan kompatibel WebGPU |
| Runtime | WebLLM/MLC WebGPU di browser, berjalan dalam Web Worker |
| Target utama | Safari/PWA di iPhone 17 Pro |
| Penyimpanan model | Cache browser/IndexedDB pada perangkat |
| Backend AI | Tidak ada |
| Data aplikasi | Supabase yang sudah ada |
| Fallback | Input transaksi manual bila AI tidak tersedia/gagal |
| Penyimpanan foto | Tidak disimpan secara default |

> Jangan menganggap ukuran atau cache model permanen. iOS dapat menghapus cache PWA saat storage menipis; aplikasi harus siap mengunduh model lagi.

## Fase 0 — Persiapan dan kriteria lolos

Tujuan fase ini adalah menyepakati standar sebelum ada perubahan besar pada aplikasi.

### Kriteria proof-of-concept dianggap lolos

- iPhone mendeteksi WebGPU tersedia.
- Model bisa diunduh dan dimuat dari PWA tanpa crash.
- Aplikasi tetap responsif saat AI bekerja.
- Foto struk berhasil menghasilkan JSON valid untuk mayoritas sampel pengujian.
- Tidak ada foto atau data struk yang dikirim ke endpoint AI eksternal.
- Jika AI gagal, form transaksi manual tetap dapat dibuka dan digunakan.

### Sampel uji yang perlu disiapkan di MacBook

Siapkan folder lokal yang **tidak di-commit** berisi 20–30 foto struk dengan variasi:

- struk kasir thermal yang jelas dan buram;
- merchant berbeda;
- nominal dengan pemisah ribuan berbeda;
- ada diskon, pajak, service charge, dan total;
- transaksi Cash, BCA, dan SeaBank;
- foto lurus, miring, terang, dan agak gelap.

Foto dipakai hanya untuk testing pribadi. Jangan masukkan foto struk asli ke Git.

### Keputusan UX sebelum coding

- Tombol fitur bernama **Scan struk**.
- Tombol hanya ada di alur tambah transaksi, bukan memproses foto otomatis di background.
- Model hanya ditawarkan ketika user memilih fitur scan.
- Layar download harus menyebut ukuran model, memakai Wi-Fi, progres, dan tombol batal.
- Bila model belum ada atau perangkat tidak mendukung, tampilkan tombol **Catat manual**.

## Fase 1 — Proof-of-concept lokal

Fase ini belum menyentuh Supabase schema atau transaksi produksi. Tujuannya hanya menjawab: “Apakah Gemma 4 E2B benar-benar nyaman di iPhone 17 Pro dalam PWA ini?”

### Pekerjaan di MacBook

1. Buat branch terpisah, misalnya `codex/local-receipt-ai-poc`.
2. Tambahkan runtime WebLLM dan model record Gemma 4 E2B yang kompatibel dengan versi runtime yang dipilih.
3. Buat modul AI yang terisolasi, misalnya:

   ```text
   src/lib/localAi/
   ├─ capability.ts       # cek WebGPU, storage, dan status model
   ├─ gemmaEngine.ts      # load/unload model di Web Worker
   ├─ receiptPrompt.ts    # prompt dan schema output JSON
   └─ receiptImage.ts     # resize/crop/normalisasi gambar
   ```

4. Gunakan Web Worker agar proses model tidak membekukan UI React.
5. Buat halaman/developer-only modal `AI Lab` yang memiliki:
   - status WebGPU;
   - tombol download/load model;
   - progres download;
   - pilihan foto dari perangkat;
   - tampilan JSON mentah dan error;
   - tombol bersihkan model/cache untuk testing ulang.
6. Pastikan model dan worker dimuat dinamis hanya saat tombol AI dibuka. Jangan masukkan model ke bundle awal aplikasi.
7. Tambahkan feature flag lokal, misalnya `VITE_LOCAL_RECEIPT_AI_ENABLED=false`, supaya fitur belum muncul bagi semua user.
8. Tambahkan logging lokal yang aman: durasi download, waktu load, waktu analisis, status sukses/gagal. Jangan log foto atau isi struk mentah ke analytics eksternal.
9. Jalankan pemeriksaan sebelum deploy:

   ```bash
   npm run build
   npm run lint
   git diff --check
   ```

10. Deploy preview/production testing melalui Vercel seperti alur project yang sudah dipakai. Tidak perlu menambah environment variable AI ataupun Vercel Function.

### Pekerjaan di iPhone 17 Pro

1. Pastikan iOS dan Safari terbaru.
2. Buka URL deployment di Safari dan instal/refresh PWA dari Home Screen.
3. Masuk ke `AI Lab`.
4. Izinkan akses kamera hanya saat tombol ambil foto ditekan.
5. Hubungkan Wi-Fi dan tekan download model.
6. Catat:
   - waktu download;
   - waktu model pertama kali siap;
   - apakah PWA menutup/reload;
   - storage yang terpakai;
   - suhu dan dampak baterai;
   - apakah UI masih responsif.
7. Uji 20–30 foto sampel secara manual.
8. Tutup aplikasi lalu buka kembali untuk melihat apakah model masih ada di cache.
9. Uji kondisi kurang ideal: mode low power, koneksi lambat saat download, storage yang tidak lega, dan pindah aplikasi saat inferensi.

### Hasil yang harus dicatat

| Metrik | Hasil iPhone 17 Pro | Catatan |
| --- | --- | --- |
| Download model |  | Wi-Fi / ukuran cache |
| Load pertama |  |  |
| Analisis satu struk |  |  |
| Akurasi total |  | benar / perlu edit / salah |
| Akurasi nominal |  |  |
| Akurasi merchant |  |  |
| Akurasi tanggal |  |  |
| Crash/reload |  |  |
| Baterai/panas |  |  |

### Keputusan sesudah fase 1

- **Lolos:** lanjut integrasi UI transaksi.
- **Model terlalu berat/sering crash:** coba quantization/model package yang lebih ringan, kecilkan ukuran gambar, atau gunakan OCR lokal + model teks kecil.
- **WebGPU tidak tersedia:** tampilkan fallback manual dan hentikan rollout local AI; jangan paksa memasang server AI tanpa keputusan baru.

## Fase 2 — Pipeline pembacaan struk

Setelah proof-of-concept lolos, ubah hasil model menjadi draft yang aman untuk form transaksi.

### Pre-processing gambar di iPhone

1. Ambil foto dari kamera atau pilih dari galeri.
2. Beri UI crop/rotate sederhana.
3. Resize foto sebelum dikirim ke model. Jangan gunakan file kamera mentah bila tidak perlu.
4. Kompres secukupnya, lalu tampilkan preview.
5. Simpan gambar hanya di memori selama proses; buang setelah user selesai kecuali suatu hari user secara eksplisit meminta fitur arsip struk.

### Prompt dan output terstruktur

Prompt harus meminta model hanya menghasilkan JSON yang sesuai schema. Nilai yang tidak terbaca harus `null`, bukan ditebak.

Field minimal:

```ts
type ReceiptDraft = {
  merchant: string | null
  transaction_date: string | null // YYYY-MM-DD
  amount: number | null           // total akhir, tanpa desimal palsu
  currency: 'IDR' | null
  type: 'expense'
  suggested_category: string | null
  evidence: {
    amount_text: string | null
    date_text: string | null
  }
  warnings: string[]
}
```

Aturan penting:

- `amount` adalah **total akhir yang dibayar**, bukan subtotal.
- Bila ada beberapa angka yang mungkin total, model memberi warning dan bukti teks.
- Rekening tidak boleh ditebak dari gambar.
- Kategori hanya saran berdasarkan merchant/item; user tetap dapat menggantinya.

### Validasi oleh kode aplikasi

Sebelum draft masuk ke UI:

- parse JSON dengan schema validator;
- nominal harus bilangan positif dan masih dalam batas wajar;
- tanggal tidak boleh format sembarang;
- kategori hanya boleh dipilih dari kategori milik user;
- bila kategori tidak cocok, pilih `Lainnya`;
- error model tidak boleh membuat transaksi baru.

## Fase 3 — Integrasi ke form transaksi

### Perubahan UI

Di `TransactionForm.tsx`:

1. Tambah aksi sekunder **Scan struk** dekat input nominal atau di layar tambah transaksi.
2. Buka modal scan, bukan langsung mengubah transaksi yang sedang diedit.
3. Setelah AI selesai, tampilkan layar review:

   - foto mini;
   - merchant;
   - nominal;
   - tanggal;
   - kategori;
   - rekening wajib dipilih;
   - warning bila hasil AI tidak yakin.

4. Tombol **Gunakan draft** baru mengisi `TransactionForm`.
5. Tombol **Simpan** yang sudah ada tetap menjadi satu-satunya aksi yang menulis ke Supabase.

### Aturan khusus rekening

- Untuk struk fisik, default rekening boleh dikosongkan atau mengingat pilihan terakhir pengguna.
- Jangan otomatis memilih Cash hanya karena ada foto struk.
- Jika user memilih Cash, transaksi normal mengurangi Cash.
- Jika user memilih BCA/SeaBank, transaksi normal mengurangi rekening tersebut.
- Tarik tunai tetap hanya tercatat melalui alur BCA → Cash yang sudah ada, bukan dari scan struk.

### Tidak perlu SQL migration pada versi pertama

Fitur scan hanya mengisi transaksi dengan struktur yang sudah ada. Karena foto struk tidak disimpan, belum perlu kolom atau tabel baru di Supabase.

Jika nanti ingin menyimpan arsip foto struk, buat fase terpisah:

- Supabase Storage private bucket;
- kebijakan akses per user;
- metadata/retensi;
- biaya storage;
- tombol hapus foto;
- persetujuan eksplisit pengguna.

## Fase 4 — Quality assurance dan keamanan

### Pengujian fungsional

- struk jelas, buram, miring, dan cahaya redup;
- merchant Indonesia yang berbeda;
- nominal besar dan kecil;
- diskon, pajak, service charge, serta beberapa angka total;
- kategori hasil AI salah lalu user menggantinya;
- Cash, BCA, dan SeaBank;
- user membatalkan scan;
- model gagal load;
- user offline setelah model sudah terunduh;
- model cache sudah dihapus oleh iOS.

### Pengujian privasi

- Pastikan tidak ada request jaringan berisi gambar struk ke endpoint model/cloud.
- Pastikan tidak ada API key AI ditambahkan ke `.env`, Vercel, frontend, atau Supabase.
- Pastikan foto tidak masuk console log, error tracker, atau screenshot otomatis.
- Pastikan hasil draft tidak tersimpan jika user menekan batal.

### Pengujian PWA

- Service worker update tidak merusak cache model.
- Update app menampilkan banner versi baru yang sudah ada.
- Model tidak ikut masuk precache app shell.
- Aplikasi tetap kecil dan cepat bila fitur AI belum digunakan.

## Fase 5 — Rollout bertahap

1. Aktifkan feature flag hanya untuk akun lu.
2. Gunakan 1–2 minggu untuk transaksi nyata sambil tetap membandingkan dengan struk asli.
3. Catat pola kesalahan: salah baca total, salah tanggal, salah merchant, salah kategori.
4. Perbaiki prompt, preprocessing, dan aturan validasi.
5. Setelah stabil, pindahkan dari `AI Lab` ke tombol Scan struk utama.
6. Tetap pertahankan input manual sebagai alur utama cadangan.

## Checklist sebelum mulai coding

### MacBook

- [ ] Working tree bersih atau perubahan saat ini sudah dipahami.
- [ ] Branch proof-of-concept dibuat.
- [ ] Foto sampel disiapkan di folder yang di-ignore Git.
- [ ] Versi WebLLM dan model package Gemma 4 E2B yang kompatibel sudah ditentukan.
- [ ] Tidak ada API key model/AI yang direncanakan.
- [ ] Build, lint, dan deploy PWA saat ini tetap hijau.

### iPhone 17 Pro

- [ ] iOS dan Safari terbaru.
- [ ] PWA Finance Tracker terinstal dari Safari.
- [ ] Storage cukup lega untuk mencoba model.
- [ ] Wi-Fi tersedia untuk download pertama.
- [ ] Izin kamera dapat diberikan saat scan.
- [ ] Siap menguji beberapa contoh struk, bukan hanya satu struk yang ideal.

## Urutan kerja yang direkomendasikan

1. Fase 0: siapkan sampel dan kriteria lolos.
2. Fase 1: buat AI Lab dan uji Gemma 4 E2B di iPhone 17 Pro.
3. Ambil keputusan dari hasil perangkat nyata.
4. Fase 2: stabilkan JSON draft dan validasi.
5. Fase 3: integrasikan ke Transaction Form.
6. Fase 4: QA privasi, error, dan PWA.
7. Fase 5: pakai sendiri dulu sebelum fitur dianggap final.

Tidak ada perubahan database dan tidak ada biaya server AI pada Fase 1–3. Risiko utama ada pada ukuran model, batas memori Safari/PWA, serta kualitas pembacaan struk; karena itu proof-of-concept di iPhone adalah gerbang wajib sebelum pekerjaan integrasi penuh.
