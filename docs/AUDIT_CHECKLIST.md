# Aile Bütçe — Sistemik Denetim Listesi

Her release öncesi manuel olarak geçilecek test senaryoları. Web araştırmasından
toplanmış 50 spesifik finans uygulaması bug'ından bizim sistemde olmayanların
düzenli kontrolü.

## 📋 Faz 1 Doğrulama (kritik bug fix'leri)

### Override Semantiği
- [ ] Hesap A seed bakiye 1000, +500 maaş yatırılmış (görünen 1500)
- [ ] Hesaplar > Düzelt → 1320 gir, Emre Garanti seç, Kaydet
- [ ] Hesaplar sayfasında o satır **1320** göstermeli (önceki +500 maaş artık eklenmez)
- [ ] Dashboard > Kasa (toplam param) → **1320** yansımalı
- [ ] Yeni harcama −200 (Emre Garanti) → Hesaplar **1120**, Dashboard kasası da o kadar azalmalı
- [ ] "Sıfırla (otomatik hesap)" butonu → Override silinir → hesap eski hale döner (seed + tüm delta)

### Fatura Ödeme
- [ ] Faturalar > Elektrik > "Bu ay ödendi olarak işaretle" tıkla
- [ ] PayBillDialog açılır → Emre Garanti seç → Kaydet
- [ ] Faturalar'da yeşil "Ödendi" badge
- [ ] Dashboard > Kasa: tutar düşmüş olmalı
- [ ] Hesaplar > Emre Garanti: "− X TL fatura" satırı görünmeli
- [ ] Geçmiş > [bu ay] > "Fatura Ödemeleri" kartında ilgili kayıt
- [ ] Geçmiş'te sil (🗑) → tüm sayfalarda geri dönmeli
- [ ] Migration: eski `paidByMonth` veri varsa BillPayment'lara çevrilmiş olmalı

## 🌐 Faz 2 — Web Araştırma Bulguları

### A. Reconciliation / Veri Bütünlüğü

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| A1 | Manuel düzeltme sonrası stale veri | Override sonrası eski delta'lar gösterilmez | ✅ Faz 1.1 ile çözüldü |
| A2 | TodayExpensesList > harcama sil → Hesaplar/Dashboard | Kasa eski haline döner | ✅ onSnapshot otomatik |
| A3 | Reconciliation zaman aşımı | Eski işlemler doğru kategoride kalır | ✅ Firestore immutable |

### B. Concurrency

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| B1 | İki tarayıcıda aynı anda harcama gir | Son yazılan kazanır, kayıp yok | ⚠ Firestore last-write-wins (kabul) |
| B2 | Optimistic update revert | UI bozulmaz | ✅ Firestore'a yazıp dönüş bekleniyor |
| B3 | Aynı anda iki cihazdan silme | Crash olmaz | ✅ Idempotent delete |
| B4 | Offline modda silinen geri gelmesi | Conflict düzgün çözülür | ⚠ Manuel test gerek |

### C. Para Birimi / Yuvarlama

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| C1 | 0.01 TL kuruş kaybı | Toplam doğru | ⚠ JS Number kullanılıyor — büyük tutarlarda izlenmeli |
| C2 | Toplam satır tutarlarıyla uyuşmaması | Eşit olmalı | ✅ Faz 1.1 — Dashboard ve Hesaplar tek formül |
| C3 | Negatif bakiye UI | Bozulmaz, "−1.000,00 ₺" formatlanır | ✅ formatTRY negative-safe |

### D. Tarih / Zaman

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| D1 | Gece yarısı geçişi (UTC vs local) | useToday lokal YYYY-MM-DD | ✅ useToday window-local |
| D2 | Ay sonu işlem hangi aya | date.startsWith(month) ile lokal | ✅ |
| D3 | Geçmişe yönelik kayıt → override etkisi | createdAt > setAt strict filter | ✅ Faz 1.1 |
| D4 | Aynı ay 2 kez markPaid | safeDocId(name, month) → tek doc | ✅ Idempotent |
| D5 | DST sorunu | Türkiye DST kullanmıyor | ✅ UTC+3 sabit |

### E. Kategori / Çift Sayım

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| E1 | Transfer A → B çift sayım | Bizde transfer feature yok | N/A |
| E2 | Refund hem gelir hem gider | Bizde yok | N/A |
| E3 | Yakıt (limit dışı) → todaysTotal | Sayılmaz | ✅ excludeFromDailyLimit |
| E4 | Auto-kategori değişimi | Manuel sistem | N/A |

### F. Tekrarlayan İşlemler

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| F1 | Fatura otomatik düşmüyor | Semi-manuel — kullanıcı işaretler | ✅ tasarım kararı |
| F2 | Payee eşleşmemesi | N/A | N/A |
| F3 | Abonelik yenilenmesi | N/A | N/A |
| F4 | Geçmiş ay ödenmemiş fatura | useReminders.bill_overdue | ✅ |

### G. Bütçe / Limit

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| G1 | Gün sonu fazla harcama devri | Yok şu an | N/A |
| G2 | Aylık tasarruf negatif UI | Bozulmaz, "−500 aşım" olarak gösterilir | ✅ |
| G3 | Limit değişimi tarihçesi | Yeni limit tüm geçmişi etkiler | ⚠ Bilinen sınırlama (README) |
| G4 | Kategori bütçe aşımı | Yok şu an | N/A |

### H. UX

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| H1 | Yanlış hesaba kayıt | Düzelt butonu var | ✅ |
| H2 | Geri al (undo) | Toast'ta "Geri al" linki | ✅ Faz 3.1 |
| H3 | Toplam tutarsızlık | Dashboard = Hesaplar | ✅ Faz 1.1 |

### I. Veri Kaybı

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| I1 | localStorage taşması | Firestore primary, localStorage sadece flag | ✅ |
| I2 | Firestore quota | Free plan limitler kontrol | ⚠ İzlenmeli |
| I3 | PWA cache eski | PWAUpdater | ✅ |
| I4 | Silinen kayıt görünmeye devam | onSnapshot otomatik | ✅ |

### J. Multi-user

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| J1 | İki kullanıcı aynı kasa | Anonim auth — eş kullanım | ✅ shared |
| J2 | Kim ekledi izi | spender field var, edit eden yok | ✅ Faz 3.2 |
| J3 | Yetkisiz değişiklik | Auth yok — aile içi güvenli | ⚠ Bilinen sınırlama |
| J4 | Rol ayrımı | Yok | ⚠ Bilinen sınırlama |

### K. Rapor / Export

| ID | Senaryo | Beklenen | Durum |
|---|---|---|---|
| K1 | Silinen kayıt export'ta | Firestore'dan gelen items → silinmiş yok | ✅ |
| K2 | Tarih aralığı export | Start/end date filtresi | ✅ Faz 3.3 |

## 🔍 Bilinen Sınırlamalar

- **G3 — Limit değişimi tarihçesi**: `useSettings.dailyLimit` tek sayı. Limit değiştirilince geçmiş aylar yeni limit ile yeniden hesaplanır. Düzeltme için `limitHistory: {month: limit}[]` koleksiyonu eklenebilir.
- **B1 — Multi-device race**: Firestore last-write-wins. Atomic transaction yok. Aynı anda iki cihazdan harcama girilirse kayıp riski düşük ama mümkün.
- **J3/J4 — Multi-user yetkilendirme**: Anonim auth; herkes her şeyi yapabilir. Aile içi güvenli, üçüncü kişi paylaşımı için Auth flow gerekli.
- **C1 — JS Number kuruş hassasiyeti**: Tutarlar JS Number (float64). Büyük tutarlarda çok küçük yuvarlama hatası mümkün — sınırlama, Number.toFixed(2) ile formatlanıyor.

## 🚀 Release Öncesi Smoke Test

Her deploy öncesi minimum:

1. ✅ `npx tsc --noEmit` temiz
2. ✅ `npm run build` başarılı
3. ✅ Override senaryosu (Faz 1 yukarıda)
4. ✅ Fatura ödeme senaryosu (Faz 1 yukarıda)
5. ✅ Borç ödeme senaryosu (geriye uyum)
6. ✅ Geçmişe yönelik kayıt — son 7 gün
7. ✅ Bildirim toast'larında undo çalışıyor

Test sonrası sorun varsa: `docs/CODEMAPS/` ya da issue açın.
