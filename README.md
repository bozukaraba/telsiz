# 🔊 Telsiz App - Web Tabanlı Push-to-Talk Uygulaması

Modern web teknolojileri kullanarak geliştirilmiş gerçek zamanlı sesli iletişim uygulaması. WebRTC teknolojisi ile peer-to-peer ses aktarımı sağlar.

## ✨ Özellikler

- 🎤 **Push-to-Talk (PTT)**: Butona basılı tutarak konuşma
- 🌐 **Web Tabanlı**: Tarayıcıda çalışır, kurulum gerektirmez
- 👥 **Çok Kullanıcılı**: Aynı odada birden fazla kişi
- 📊 **Ses Seviyesi Göstergesi**: Gerçek zamanlı VU meter
- 📱 **Mobil Uyumlu**: Dokunmatik ekran desteği
- ⌨️ **Klavye Desteği**: Space tuşu ile PTT
- 🔄 **Otomatik Yeniden Bağlantı**: Bağlantı kopma durumunda
- 🎯 **Düşük Gecikme**: WebRTC ile hızlı ses aktarımı

## 🛠 Teknolojiler

### Frontend
- **React 18** + TypeScript
- **WebRTC** (getUserMedia, RTCPeerConnection)
- **Socket.IO Client** (signaling)
- **CSS3** (Modern tasarım)

### Backend
- **Node.js** + Express
- **Socket.IO** (WebSocket)
- **TypeScript**

### DevOps
- **Docker** + Docker Compose
- **NGINX** (reverse proxy)
- **Coturn** (TURN sunucusu)

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- Docker & Docker Compose
- HTTPS (mikrofon izni için gerekli)

### 1. Projeyi İndirin
```bash
git clone https://github.com/your-repo/telsiz-app.git
cd telsiz-app
```

### 2. Bağımlılıkları Yükleyin
```bash
npm run install:all
```

### 3. Geliştirme Ortamında Çalıştırın
```bash
# Hem server hem client'ı başlatır
npm run dev
```

### 4. Production ile Docker
```bash
# Docker ile build ve çalıştır
docker-compose up --build

# Arka planda çalıştır
docker-compose up -d
```

## 🎯 Kullanım

### Temel Kullanım
1. Tarayıcınızda `http://localhost:3000` adresine gidin
2. Kullanıcı adınızı ve oda adını girin
3. Mikrofon iznini verin
4. PTT butonuna basıp tutarak konuşun
5. Butonu bıraktığınızda ses kesilir

### Klavye Kısayolları
- **Space**: Push-to-Talk (basılı tut)
- **Escape**: Odadan ayrıl

### Mobil Kullanım
- PTT butonuna dokunup tutun
- Parmağınızı çektiğinizde ses kesilir

## 📁 Proje Yapısı

```
telsiz-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React bileşenleri
│   │   ├── contexts/       # Context API
│   │   └── hooks/          # Custom hooks
│   └── public/             # Statik dosyalar
├── server/                 # Node.js backend
│   └── src/
│       ├── index.ts        # Ana server dosyası
│       └── signaling.ts    # WebSocket signaling
├── docker-compose.yml      # Docker orchestration
├── Dockerfile             # Container build
└── README.md              # Bu dosya
```

## 🔧 Konfigürasyon

### Environment Variables
```bash
# Server
PORT=3001
NODE_ENV=production
CLIENT_URL=http://localhost:3000

# Client
REACT_APP_SERVER_URL=http://localhost:3001
```

### STUN/TURN Sunucuları
```javascript
// Varsayılan konfigürasyon
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

## 🚀 Dağıtım

### Canlı Demo
- **Frontend**: [https://telsiz.netlify.app](https://telsiz.netlify.app)
- **Backend**: Railway üzerinde deploy

### Railway ile Backend Deploy
```bash
# 1. Railway CLI yükle
npm install -g @railway/cli

# 2. Railway'e login
railway login

# 3. Proje oluştur
railway new

# 4. GitHub repo'yu bağla
railway connect

# 5. Deploy
railway up
```

### Netlify ile Frontend Deploy
```bash
# 1. GitHub'a push et
git push origin main

# 2. Netlify'da repo'yu bağla
# 3. Build ayarları:
#    - Base directory: client
#    - Build command: npm run build
#    - Publish directory: build
```

### Manuel Dağıtım
```bash
# 1. Build
npm run build

# 2. Server başlat
npm start

# 3. NGINX konfigürasyonu
# nginx.conf dosyasını kullanın
```

## 🔒 Güvenlik

- **HTTPS Zorunlu**: Mikrofon erişimi için gerekli
- **CORS Koruması**: Cross-origin istekleri kontrol
- **Rate Limiting**: DDoS koruması
- **Input Validation**: Kullanıcı girdi kontrolü

## 🐛 Sorun Giderme

### Mikrofon Çalışmıyor
- HTTPS kullandığınızdan emin olun
- Tarayıcı izinlerini kontrol edin
- Mikrofon başka uygulama tarafından kullanılıyor olabilir

### Bağlantı Problemi
- Server'ın çalıştığını kontrol edin
- Firewall ayarlarını kontrol edin
- Browser console'da hata mesajlarına bakın

### Ses Duyulmuyor
- Hoparlör sesini kontrol edin
- WebRTC bağlantı durumunu kontrol edin
- TURN sunucusu çalışıyor mu?

## 📊 Performans

- **Ses Gecikme**: ~50-100ms (optimum ağ koşullarında)
- **Bant Genişliği**: ~32kbps per kullanıcı
- **Maksimum Kullanıcı**: 10-20 kişi (sunucu kapasitesine bağlı)

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 🆘 Destek

Sorularınız için:
- GitHub Issues
- Email: your-email@example.com
- Telegram: @your-telegram

## 🚀 Gelecek Özellikler

- [ ] Text chat entegrasyonu
- [ ] Ses kaydı ve kayıttan oynatma
- [ ] Kullanıcı rolleri ve yetkilendirme
- [ ] MongoDB entegrasyonu
- [ ] Progressive Web App (PWA) desteği
- [ ] React Native mobil uygulama
- [ ] Analytics ve raporlama

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!** 