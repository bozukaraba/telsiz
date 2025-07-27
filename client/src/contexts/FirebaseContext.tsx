import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, User } from 'firebase/auth';
import { ref, set, remove, onValue, push, child, get } from 'firebase/database';
import { auth, database } from '../firebase/config';

interface Room {
  id: string;
  name: string;
  password: string;
  users: { [key: string]: RoomUser };
  createdAt: number;
}

interface RoomUser {
  id: string;
  username: string;
  joinedAt: number;
  isSpeaking: boolean;
}

interface Signal {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  fromUserId: string;
  toUserId: string;
  timestamp: number;
}

interface FirebaseContextType {
  user: User | null;
  currentRoom: Room | null;
  isConnected: boolean;
  connectionError: string | null;
  joinRoom: (roomId: string, username: string, password: string) => Promise<void>;
  createRoom: (roomId: string, username: string, password: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  sendSignal: (targetUserId: string, signal: any, type: 'offer' | 'answer' | 'ice-candidate') => Promise<void>;
  startPTT: () => Promise<void>;
  stopPTT: () => Promise<void>;
  onUserJoined: (callback: (user: RoomUser) => void) => void;
  onUserLeft: (callback: (userId: string) => void) => void;
  onSignalReceived: (callback: (signal: Signal) => void) => void;
  onPTTStarted: (callback: (userId: string) => void) => void;
  onPTTStopped: (callback: (userId: string) => void) => void;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase hook Firebase Provider içinde kullanılmalı');
  }
  return context;
};

interface FirebaseProviderProps {
  children: React.ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  // Event callback'leri
  const [userJoinedCallback, setUserJoinedCallback] = useState<(user: RoomUser) => void>();
  const [userLeftCallback, setUserLeftCallback] = useState<(userId: string) => void>();
  const [signalCallback, setSignalCallback] = useState<(signal: Signal) => void>();
  const [pttStartedCallback, setPTTStartedCallback] = useState<(userId: string) => void>();
  const [pttStoppedCallback, setPTTStoppedCallback] = useState<(userId: string) => void>();

  // Firebase Auth
  useEffect(() => {
    console.log('🔥 Firebase Auth başlatılıyor...');
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔥 Auth durumu değişti:', user ? `Giriş yapıldı (${user.uid})` : 'Çıkış yapıldı');
      setUser(user);
      setIsConnected(!!user);
      
      if (user) {
        setConnectionError(null);
        console.log('✅ Firebase bağlantısı başarılı');
      }
    });

    // Anonim giriş yap
    signInAnonymously(auth)
      .then(() => {
        console.log('✅ Anonim giriş başarılı');
      })
      .catch((error) => {
        console.error('❌ Anonim giriş hatası:', error);
        setConnectionError(`Firebase Auth hatası: ${error.message}`);
      });

    return () => unsubscribe();
  }, []);

  // Oda oluştur
  const createRoom = async (roomId: string, username: string, password: string): Promise<void> => {
    if (!user) {
      throw new Error('Kullanıcı girişi yapılmamış');
    }

    try {
      console.log('🏗️ Oda oluşturuluyor:', roomId);
      
      const roomRef = ref(database, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      
      if (roomSnapshot.exists()) {
        // Mevcut oda varsa şifre kontrol et ve katıl
        const existingRoom = roomSnapshot.val() as Room;
        if (existingRoom.password !== password) {
          throw new Error('Bu oda adı mevcut ama şifre yanlış');
        }
        // Şifre doğruysa mevcut odaya katıl
        await joinRoom(roomId, username, password);
        return;
      }

      // Yeni oda oluştur
      const newRoom: Room = {
        id: roomId,
        name: roomId,
        password: password,
        users: {},
        createdAt: Date.now()
      };

      await set(roomRef, newRoom);
      console.log('✅ Oda oluşturuldu');

      // Kullanıcıyı odaya ekle
      await joinRoom(roomId, username, password);
      
    } catch (error: any) {
      console.error('❌ Oda oluşturma hatası:', error);
      setConnectionError(error.message);
      throw error;
    }
  };

  // Odaya katıl
  const joinRoom = async (roomId: string, username: string, password: string): Promise<void> => {
    if (!user) {
      throw new Error('Kullanıcı girişi yapılmamış');
    }

    try {
      console.log('🚪 Odaya katılma denemesi:', roomId);
      
      const roomRef = ref(database, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      
      if (!roomSnapshot.exists()) {
        throw new Error(`"${roomId}" adlı oda bulunamadı. Önce oda oluşturun.`);
      }

      const roomData = roomSnapshot.val() as Room;
      
      // Şifre kontrolü
      if (roomData.password !== password) {
        throw new Error('Oda şifresi yanlış');
      }

      setUsername(username);
      
      // Kullanıcıyı odaya ekle
      const userRef = ref(database, `rooms/${roomId}/users/${user.uid}`);
      const roomUser: RoomUser = {
        id: user.uid,
        username,
        joinedAt: Date.now(),
        isSpeaking: false
      };

      await set(userRef, roomUser);
      console.log('✅ Odaya katıldı');

      // Oda bilgilerini dinle
      onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        if (roomData) {
          console.log('📡 Oda verisi güncellendi');
          setCurrentRoom({
            id: roomId,
            name: roomId,
            password: roomData.password,
            users: roomData.users || {},
            createdAt: roomData.createdAt || Date.now()
          });
        }
      });

      // Kullanıcı değişikliklerini dinle
      const usersRef = ref(database, `rooms/${roomId}/users`);
      onValue(usersRef, (snapshot) => {
        const users = snapshot.val();
        console.log('👥 Kullanıcılar güncellendi:', users);
        
        if (users && currentRoom) {
          // Yeni kullanıcılar için callback
          Object.values(users).forEach((roomUser: any) => {
            if (roomUser.id !== user.uid && userJoinedCallback) {
              userJoinedCallback(roomUser);
            }
          });
        }
      });

      // Signal dinleyicisi
      const signalsRef = ref(database, `signals/${user.uid}`);
      onValue(signalsRef, (snapshot) => {
        const signals = snapshot.val();
        if (signals && signalCallback) {
          console.log('📞 Signal alındı');
          Object.values(signals).forEach((signal: any) => {
            signalCallback(signal);
            // Signal'ı oku olarak işaretle (sil)
            remove(ref(database, `signals/${user.uid}/${signal.id}`));
          });
        }
      });

      // PTT dinleyicileri
      const pttRef = ref(database, `rooms/${roomId}/ptt`);
      onValue(pttRef, (snapshot) => {
        const pttData = snapshot.val();
        console.log('🎤 PTT durumu:', pttData);
        
        if (pttData && pttData.isActive && pttData.userId !== user.uid) {
          // Başka kullanıcı konuşuyor
          if (pttStartedCallback) pttStartedCallback(pttData.userId);
        } else {
          // PTT durdu veya veri yok
          if (pttStoppedCallback) pttStoppedCallback('');
        }
      });

    } catch (error: any) {
      console.error('❌ Odaya katılma hatası:', error);
      setConnectionError(error.message);
      throw error;
    }
  };

  // Odadan ayrıl
  const leaveRoom = async (): Promise<void> => {
    if (!user || !currentRoom) return;

    try {
      console.log('🚪 Odadan ayrılıyor...');
      const userRef = ref(database, `rooms/${currentRoom.id}/users/${user.uid}`);
      await remove(userRef);
      setCurrentRoom(null);
      console.log('✅ Odadan ayrıldı');
    } catch (error: any) {
      console.error('❌ Odadan ayrılma hatası:', error);
    }
  };

  // Signal gönder
  const sendSignal = async (targetUserId: string, signal: any, type: 'offer' | 'answer' | 'ice-candidate'): Promise<void> => {
    if (!user) return;

    try {
      console.log('📞 Signal gönderiliyor:', type, 'to', targetUserId);
      const signalRef = push(ref(database, `signals/${targetUserId}`));
      const signalData: Signal = {
        type,
        data: signal,
        fromUserId: user.uid,
        toUserId: targetUserId,
        timestamp: Date.now()
      };

      await set(signalRef, signalData);
      console.log('✅ Signal gönderildi');
    } catch (error: any) {
      console.error('❌ Signal gönderme hatası:', error);
    }
  };

  // PTT başlat
  const startPTT = async (): Promise<void> => {
    if (!user || !currentRoom) return;

    try {
      console.log('🎤 PTT başlatılıyor...');
      const pttRef = ref(database, `rooms/${currentRoom.id}/ptt`);
      await set(pttRef, {
        isActive: true,
        userId: user.uid,
        username,
        timestamp: Date.now()
      });
      console.log('✅ PTT başlatıldı');
    } catch (error: any) {
      console.error('❌ PTT başlatma hatası:', error);
    }
  };

  // PTT durdur
  const stopPTT = async (): Promise<void> => {
    if (!user || !currentRoom) return;

    try {
      console.log('🎤 PTT durduruluyor...');
      const pttRef = ref(database, `rooms/${currentRoom.id}/ptt`);
      // PTT durdururken veriyi tamamen sil
      await remove(pttRef);
      console.log('✅ PTT durduruldu');
    } catch (error: any) {
      console.error('❌ PTT durdurma hatası:', error);
    }
  };

  // Event listener'ları
  const onUserJoined = (callback: (user: RoomUser) => void) => {
    setUserJoinedCallback(() => callback);
  };

  const onUserLeft = (callback: (userId: string) => void) => {
    setUserLeftCallback(() => callback);
  };

  const onSignalReceived = (callback: (signal: Signal) => void) => {
    setSignalCallback(() => callback);
  };

  const onPTTStarted = (callback: (userId: string) => void) => {
    setPTTStartedCallback(() => callback);
  };

  const onPTTStopped = (callback: (userId: string) => void) => {
    setPTTStoppedCallback(() => callback);
  };

  const value: FirebaseContextType = {
    user,
    currentRoom,
    isConnected,
    connectionError,
    joinRoom,
    createRoom,
    leaveRoom,
    sendSignal,
    startPTT,
    stopPTT,
    onUserJoined,
    onUserLeft,
    onSignalReceived,
    onPTTStarted,
    onPTTStopped
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}; 