# CloudStorage File Manager

DigitalOcean Spaces (S3 uyumlu) icin gelistirilmis modern web tabanli dosya yonetim araci.

English documentation: [README.md](README.md)

## Canli Link

- Uygulama: https://webisso.github.io/cloudstorage-filemanager/

## Proje Nedir?

CloudStorage File Manager, obje depolama yonetimini tek bir arayuzden hizli ve pratik sekilde yapabilmek icin gelistirilen admin tarzi bir web uygulamasidir.

Sagladigi temel yetenekler:

- API kimlik bilgileri ve bucket URL ile guvenli giris
- Breadcrumb ile klasor/dizin gezintisi
- Gelismis Upload Center ile coklu dosya yukleme
- Toplu ve dosya bazli public/private erisim secimi
- Metin dosyasi duzenleme ve secilebilir kaydetme tipi
- Yeniden adlandirma, silme, public link kopyalama
- Oturumun korunmasi ve EN/TR arayuz

## Teknoloji Yigini

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4 + shadcn/base-ui
- AWS SDK v3 (S3 client + presigner)
- Sonner (bildirimler)

## Ana Ozellikler

### Kimlik Dogrulama ve Oturum

- Bucket URL, Access Key ve Secret Key ile giris
- Local storage uzerinden oturumu acik tutma secenegi
- F5 sonrasi oturum geri yukleme

### Dosya Yonetimi

- Dosya/klasor listeleme
- Gelistirilmis breadcrumb ile gezinme
- Klasor olusturma
- Dosya/klasor yeniden adlandirma
- Secili ogeleri silme

### Upload Center

- Kenarlardan bosluklu tam panel modal yapisi
- Coklu dosya kuyrugu
- Toplu yukleme ve dosya bazli yukleme modlari
- ACL/erisim secimi:
  - Public (public-read)
  - Private
- Satir bazli durum takibi (kuyrukta/yukleniyor/yuklendi/hata)
- Canli ilerleme gostergesi:
  - Yuzde
  - MB/s hiz (son 1 saniye hareketli ortalama)

### Erisim ve Paylasim

- Dosya tablosunda erisim kolonu (public/private)
- Nesne ACL kontrolu
- Public link kopyalama

### Metin Editoru

- .txt dosyalarini modalda acip duzenleme
- Kayit sirasinda erisim tipi secimi

### Dil Desteği

- Ingilizce ve Turkce arayuz

## Proje Yapisi

- Arayuz ve uygulama akisi: src/App.tsx
- Spaces islemleri ve upload logic: src/lib/spaces.ts
- Vite ve dev proxy: vite.config.ts
- Statik dosyalar: public/

## Lokal Gelistirme

### Gereksinimler

- Node.js 18+
- npm

### Kurulum

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## Deploy

Proje GitHub Pages icin gh-pages ile hazirlanmistir.

```bash
npm run deploy
```

## CORS Notu (DigitalOcean Spaces)

Tarayicidan erisim icin bucket CORS ayari zorunludur.

Ornek gereksinimler:

- Allowed origin: https://webisso.github.io (veya kendi domaininiz)
- Allowed methods: GET, PUT, POST, DELETE, HEAD
- Allowed headers: *

Node uzerinden CORS ayari yapmak icin script mevcut:

```bash
npm run spaces:cors
```

## Planlanan Ozellikler

- Upload Center icin surukle-birak destegi
- Kuyrukta duraklat/devam et/iptal kontrolleri
- Yukleme cakismasi stratejileri (ustune yaz, yeniden adlandir, atla)
- Buyuk dizinler icin arama ve filtreleme
- Gelismis siralama (ad, boyut, tarih, erisim)
- Secili dosyalar icin toplu ACL guncelleme
- Mobilde tabloyu daha okunur hale getirme (acilir detay)
- Erisim tipi icin rol bazli varsayilan profiller
- Opsiyonel dark mode

## Lisans

MIT (veya tercih edilen lisans, gerekirse guncelleyin).
