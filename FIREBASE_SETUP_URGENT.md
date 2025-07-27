# 🚨 ACİL Firebase Kurulum Adımları

Bağlantı problemini çözmek için **bu adımları sırayla** takip edin:

## 1. ✅ Authentication'ı Aktif Et

1. [Firebase Console](https://console.firebase.google.com/u/0/project/telsiz-94582/authentication) → **Authentication**
2. **Get started** butonuna tıklayın
3. **Sign-in method** sekmesine gidin
4. **Anonymous** satırına tıklayın
5. **Enable** toggle'ını açın ✅
6. **Save** butonuna tıklayın

## 2. ✅ Realtime Database Oluştur

1. [Firebase Console](https://console.firebase.google.com/u/0/project/telsiz-94582/database) → **Realtime Database**
2. **Create Database** butonuna tıklayın
3. **Start in test mode** seçin (**Güvenlik kuralları sonra ayarlanacak**)
4. **Location**: `us-central1` seçin
5. **Done** butonuna tıklayın

## 3. ✅ Database URL'ini Kontrol Et

Database oluştuktan sonra:
1. URL'i kopyalayın (örn: `https://telsiz-94582-default-rtdb.firebaseio.com/`)
2. Bu URL config'te doğru mu kontrol edin

## 4. ✅ Database Kurallarını Ayarla

Realtime Database > **Rules** sekmesinde:

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

**Publish** butonuna tıklayın.

## 5. 🧪 Test Et

1. Site: https://telsiz.netlify.app
2. **Browser Developer Tools** açın (F12)
3. **Console** sekmesinde Firebase log'larını izleyin
4. Şu mesajları görmeli:
   - `🔥 Firebase Auth başlatılıyor...`
   - `✅ Anonim giriş başarılı`
   - `✅ Firebase bağlantısı başarılı`

## 🔍 Debug Kontrolleri

### Console'da Görülmesi Gerekenler:
```
🔥 Firebase Auth başlatılıyor...
🔥 Auth durumu değişti: Giriş yapıldı (user-id)
✅ Firebase bağlantısı başarılı
✅ Anonim giriş başarılı
🏗️ Oda oluşturuluyor: test-room
✅ Oda oluşturuldu
🚪 Odaya katılma denemesi: test-room
✅ Odaya katıldı
```

### Hata Durumunda:
- ❌ `Firebase Auth hatası: ...` → Authentication aktif değil
- ❌ `PERMISSION_DENIED` → Database kuralları yanlış
- ❌ `Oda bulunamadı` → Database çalışmıyor

## 🔧 Yaygın Problemler

### Problem: "Firebase Auth hatası"
**Çözüm**: Authentication > Anonymous aktif değil

### Problem: "PERMISSION_DENIED"
**Çözüm**: Database rules yanlış yapılandırılmış

### Problem: "Network error"
**Çözüm**: Database URL yanlış veya database oluşturulmamış

## 🎯 Başarı Kontrolü

Bu adımlardan sonra:
1. ✅ Giriş ekranı çalışır
2. ✅ Oda oluşturma/katılma çalışır
3. ✅ "Bağlantı problemi" mesajı kaybolur
4. ✅ Debug panelinde ✅ işaretleri görünür
5. ✅ Firebase Console'da data görünür

**Bu adımları tamamladıktan sonra uygulama tam çalışır durumda olacak!** 