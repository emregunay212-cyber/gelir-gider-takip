# Aile Bütçe — Emre & Sıla

Çift kullanımlı, mobil-first, gerçek-zamanlı senkron eden gelir-gider takip uygulaması.
**Günlük harcama limiti** mantığıyla çalışır: limitin altında kalan miktar kasaya yatar,
aşım olursa ertesi günün limitinden düşülür.

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript (strict)
- **Stil:** Tailwind CSS v4 + lucide-react ikonlar
- **Routing:** React Router v6
- **Backend:** Firebase (Firestore + Auth)
- **PWA:** vite-plugin-pwa (Android ana ekrana eklenebilir)
- **Hosting:** Vercel
- **Validation:** Zod
- **Form:** React Hook Form
- **Tarih:** date-fns

## Kurulum

### 1. Bağımlılıkları yükle

```bash
npm install
```

### 2. Firebase projesi oluştur

1. https://console.firebase.google.com adresinden yeni proje oluştur (örn: `aile-butce-emre-sila`).
2. **Build → Firestore Database** sekmesinden veritabanını başlat (production mode, EU region önerilir).
3. **Build → Authentication → Sign-in method** sekmesinden Email/Password sağlayıcısını aç.
4. **Project Settings → General → Your apps** → Web app ekle, config bilgilerini al.

### 3. Ortam değişkenlerini ayarla

```bash
cp .env.example .env.local
```

`.env.local` dosyasını aç ve Firebase config değerlerini gir:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Geliştirme sunucusunu başlat

```bash
npm run dev
```

http://localhost:5173 adresinde açılır.

### 5. Üretim build'i

```bash
npm run build
npm run preview
```

## Vercel Deploy

1. GitHub'a push et.
2. https://vercel.com → Import Project → repoyu seç.
3. Environment variables sekmesinde tüm `VITE_FIREBASE_*` değişkenlerini ekle.
4. Deploy. Custom domain isteğe bağlı.

## Klasör Yapısı

```
src/
├── components/      # Layout, BottomNav, vb. paylaşılan bileşenler
├── pages/           # Dashboard, Borçlar, Gelirler, Hesaplar, Faturalar, Geçmiş, Ayarlar
├── features/        # (boş — Faz 4+ için)
├── hooks/           # (boş — Faz 4+ için)
├── lib/             # firebase.ts, format.ts, utils.ts
├── db/              # seed.ts (mevcut finansal durum)
├── types/           # TypeScript veri modelleri
├── App.tsx          # Router yapılandırması
├── main.tsx         # React kök
└── index.css        # Tailwind + tema
```

## Veri Modeli (Özet)

- **Household** — hane ayarları
- **User** — Emre / Sıla
- **Account** — banka hesabı / nakit / kasa (sanal sayaç)
- **Income** — maaş / kurs / maç ücreti (monthly / seasonal / one-time)
- **Debt** — kredi / kart / kişisel borç (4 alt tip)
- **RecurringFixedExpense** — faturalar (elektrik, su, doğalgaz, telefon, internet)
- **Expense** — günlük harcama
- **DailyLimit** — gün bazlı limit + carry-over hesabı
- **KasaTransaction** — kasa hareketleri

## Faz Listesi

- [x] **Faz 1** — Proje iskeleti, tech stack, klasör yapısı, ilk sayfa görünümleri (seed datadan)
- [ ] **Faz 2** — Firestore repository layer + auth flow
- [ ] **Faz 3** — Seed datasını canlı Firestore'a yükle
- [ ] **Faz 4** — Günlük limit hesaplama + Dashboard canlı veri + hızlı harcama girişi
- [ ] **Faz 5** — Detay sayfaları (borç düzenleme, gelir güncelleme, fatura tutarları)
- [ ] **Faz 6** — Geçmiş + takvim + istatistik
- [ ] **Faz 7** — PWA polish + Vercel deploy + mobile UX testi

## Mevcut Finansal Durum (Seed)

| Kalem | Tutar |
|---|---|
| Aylık beklenen gelir (ortalama) | ~74.500 TL |
| Aylık borç ödemeleri | ~41.240 TL |
| Aylık fatura | (girilecek) |
| Günlük harcama bütçesi (510 × 30) | 15.300 TL |
| Toplam hesap bakiyesi (kasa hariç) | ~37.821 TL |

Detay: [src/db/seed.ts](src/db/seed.ts)

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim build |
| `npm run preview` | Build önizleme |
| `npm run lint` | ESLint kontrolü |
