# QA Fase 4 — Scan struk lokal

Status per 2026-11-05, branch `codex/local-receipt-ai-poc`.

## Sudah diverifikasi lewat kode dan build

| Cek | Hasil | Bukti |
| --- | --- | --- |
| Tidak ada `fetch`/XHR/beacon di kode AI | Lolos | grep `src/lib/localAi`, `ReceiptScanModal`, `AILab` kosong |
| Tidak ada `console.*` yang bisa membocorkan struk | Lolos | grep kosong |
| Tidak ada API key/secret AI | Lolos | grep kosong; flag cuma `true/false` |
| Foto tidak di-storage (local/session/IndexedDB) | Lolos | grep kosong; foto hanya di memori, object URL di-revoke saat modal ditutup |
| Host eksternal runtime | Hanya model | `huggingface.co` (bobot), `raw.githubusercontent.com` (wasm); tidak ada endpoint yang menerima gambar |
| Runtime WebLLM tidak masuk precache | Lolos | `sw.js` tidak memuat `lib-*` dan `gemmaEngine.worker-*`; precache 31 entri ±625 KiB |
| Runtime WebLLM di-cache saat dipakai | Ada | runtime cache `local-ai-runtime-cache` di `sw.js` |
| Update app tidak menghapus cache model | Aman | `cleanupOutdatedCaches` hanya menyentuh cache precache Workbox; bobot model ada di Cache Storage milik WebLLM |
| Draft hilang saat batal | Lolos | state review di-reset saat modal dibuka/ditutup; tidak ada penulisan Supabase di alur scan |
| Satu-satunya jalur tulis | Simpan di form | `Gunakan draft` hanya memanggil `setState` di `TransactionForm` |
| Flag mati = fitur tidak ada | Lolos | route `/ai-lab` dan tombol Scan struk tidak dirender |
| Build, lint, `git diff --check` | Lolos | |

Catatan: unduhan model memang memakai jaringan (Hugging Face + GitHub). Itu bukan data struk, tapi bukan "offline". Sesuai definisi di runbook.

## Perlu dites manual di iPhone 17 Pro

Centang setelah dicoba di preview Vercel.

### Fungsional
- [ ] WebGPU terdeteksi di Safari dan di PWA Home Screen
- [ ] Model terunduh, dimuat, dan modal tidak crash
- [ ] Struk jelas → draft benar (nominal, tanggal, merchant)
- [ ] Struk buram, miring, gelap
- [ ] Struk dengan diskon/pajak/service: nominal = total akhir
- [ ] Kategori salah → bisa diganti di layar review
- [ ] Cash, BCA, SeaBank dipilih manual; tombol Gunakan draft nonaktif sebelum rekening dipilih
- [ ] Batal saat download, saat membaca, dan di layar review
- [ ] Model gagal load → muncul pesan + Catat manual
- [ ] Offline setelah model terunduh: scan tetap jalan
- [ ] Cache dibersihkan (tombol di AI Lab) → minta download lagi

### Privasi
- [ ] Safari Web Inspector > Network: tidak ada request berisi gambar saat analisis
- [ ] Tidak ada request ke domain selain Supabase, Hugging Face, GitHub, Vercel
- [ ] Setelah batal, form transaksi tidak terisi

### PWA
- [ ] Banner "versi baru" tetap muncul dan update tidak menghapus model
- [ ] Aplikasi tetap cepat dibuka bila fitur AI tidak dipakai
- [ ] Pindah app saat analisis: perilaku tercatat (crash/reload/lanjut)
- [ ] Mode hemat daya, baterai, dan panas dicatat

### Metrik (isi untuk keputusan Fase 1)
| Metrik | Hasil |
| --- | --- |
| Download model | |
| Load pertama | |
| Analisis satu struk | |
| Akurasi nominal / tanggal / merchant | |
| Crash / reload | |
| Baterai / panas | |

## Risiko yang masih terbuka
- Belum pasti Gemma 4 E2B di WebLLM menerima input gambar. Jika tidak, ganti ke OCR lokal + model teks kecil.
- iOS dapat menghapus cache PWA saat storage menipis; aplikasi sudah siap mengunduh ulang, tapi 2–3 GB tidak murah.
- Belum ada pengujian otomatis; validasi draft baru dites manual.
