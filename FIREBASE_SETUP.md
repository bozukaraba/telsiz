# 🔥 Firebase Kurulum Rehberi

Firebase backend'i aktif etmek için aşağıdaki adımları takip edin.

## 1. Firebase Console Ayarları

### Authentication'ı Etkinleştir
1. [Firebase Console](https://console.firebase.google.com/u/0/project/telsiz-94582/) > Authentication
2. **Get Started** > **Sign-in method**
3. **Anonymous** seçeneğini **Enable** edin
4. **Save** edin

### Realtime Database Oluştur
1. Firebase Console > **Realtime Database**
2. **Create Database**
3. **Start in test mode** seçin (güvenlik kuralları otomatik uygulanacak)
4. **Location**: `us-central1` (veya size yakın)
5. **Done**

### Firebase Config Bilgilerini Al
1. Firebase Console > **Project Settings** (⚙️ ikonu)
2. **General** tab > **Your apps** > **Web app**
3. App nickname: `telsiz-web`
4. **Also set up Firebase Hosting** ✅ işaretle
5. **Register app**
6. **Config** bilgilerini kopyala

## 2. Config Dosyasını Güncelle

`client/src/firebase/config.ts` dosyasındaki config'i güncelleyin:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "telsiz-94582.firebaseapp.com",
  databaseURL: "https://telsiz-94582-default-rtdb.firebaseio.com",
  projectId: "telsiz-94582",
  storageBucket: "telsiz-94582.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

## 3. Güvenlik Kurallarını Uygula

1. Realtime Database > **Rules** sekmesi
2. Aşağıdaki kuralları yapıştırın:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "users": {
          "$userId": {
            ".validate": "newData.hasChildren(['id', 'username', 'joinedAt', 'isSpeaking'])"
          }
        },
        "ptt": {
          ".validate": "newData.hasChildren(['isActive', 'userId', 'username', 'timestamp'])"
        }
      }
    },
    "signals": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": true,
        "$signalId": {
          ".validate": "newData.hasChildren(['type', 'data', 'fromUserId', 'toUserId', 'timestamp'])"
        }
      }
    }
  }
}
```

3. **Publish** edin

## 4. Firebase Hosting (Opsiyonel)

Firebase CLI ile deploy edebilirsiniz:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 5. Test Et

1. Config'i güncelledikten sonra:
```bash
cd client
npm run build
npm start
```

2. Site: https://telsiz.netlify.app
3. Firebase Console > Realtime Database'de verileri görün

## 🎯 Beklenen Sonuç

- ✅ Anonim giriş otomatik
- ✅ Oda oluşturma/katılma çalışır  
- ✅ WebRTC signaling Firebase üzerinden
- ✅ PTT gerçek zamanlı senkronize
- ✅ Kullanıcı listesi dinamik

## 🔧 Sorun Giderme

### Firebase bağlantı hatası
- Config bilgilerini kontrol edin
- Realtime Database açık mı?
- Authentication etkin mi?

### WebRTC bağlanamıyor
- HTTPS gerekli (Netlify otomatik)
- Browser console'da hata var mı?
- STUN server erişimi?

### PTT çalışmıyor
- Mikrofon izni var mı?
- Firebase kuralları doğru mu?
- Realtime Database'de `ptt` node'u var mı? 