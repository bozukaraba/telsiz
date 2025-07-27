import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, User } from 'firebase/auth';
import { ref, set, remove, onValue, push, child, get } from 'firebase/database';
import { auth, database } from '../firebase/config';

interface Room {
  id: string;
  name: string;
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
  joinRoom: (roomId: string, username: string) => Promise<void>;
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
  const [username, setUsername] = useState<string>('');

  // Event callback'leri
  const [userJoinedCallback, setUserJoinedCallback] = useState<(user: RoomUser) => void>();
  const [userLeftCallback, setUserLeftCallback] = useState<(userId: string) => void>();
  const [signalCallback, setSignalCallback] = useState<(signal: Signal) => void>();
  const [pttStartedCallback, setPTTStartedCallback] = useState<(userId: string) => void>();
  const [pttStoppedCallback, setPTTStoppedCallback] = useState<(userId: string) => void>();

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setIsConnected(!!user);
    });

    // Anonim giriş yap
    signInAnonymously(auth).catch((error) => {
      console.error('Anonim giriş hatası:', error);
    });

    return () => unsubscribe();
  }, []);

  // Odaya katıl
  const joinRoom = async (roomId: string, username: string): Promise<void> => {
    if (!user) return;

    try {
      const roomRef = ref(database, `rooms/${roomId}`);
      const userRef = ref(database, `rooms/${roomId}/users/${user.uid}`);
      
      setUsername(username);

      // Kullanıcıyı odaya ekle
      const roomUser: RoomUser = {
        id: user.uid,
        username,
        joinedAt: Date.now(),
        isSpeaking: false
      };

      await set(userRef, roomUser);

      // Oda bilgilerini dinle
      onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        if (roomData) {
          setCurrentRoom({
            id: roomId,
            name: roomId,
            users: roomData.users || {},
            createdAt: roomData.createdAt || Date.now()
          });
        }
      });

      // Kullanıcı değişikliklerini dinle
      const usersRef = ref(database, `rooms/${roomId}/users`);
      onValue(usersRef, (snapshot) => {
        const users = snapshot.val();
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
        if (pttData) {
          if (pttData.isActive && pttData.userId !== user.uid) {
            if (pttStartedCallback) pttStartedCallback(pttData.userId);
          } else if (!pttData.isActive && pttStoppedCallback) {
            if (pttStoppedCallback) pttStoppedCallback(pttData.userId);
          }
        }
      });

    } catch (error) {
      console.error('Odaya katılma hatası:', error);
      throw error;
    }
  };

  // Odadan ayrıl
  const leaveRoom = async (): Promise<void> => {
    if (!user || !currentRoom) return;

    try {
      const userRef = ref(database, `rooms/${currentRoom.id}/users/${user.uid}`);
      await remove(userRef);
      setCurrentRoom(null);
    } catch (error) {
      console.error('Odadan ayrılma hatası:', error);
    }
  };

  // Signal gönder
  const sendSignal = async (targetUserId: string, signal: any, type: 'offer' | 'answer' | 'ice-candidate'): Promise<void> => {
    if (!user) return;

    try {
      const signalRef = push(ref(database, `signals/${targetUserId}`));
      const signalData: Signal = {
        type,
        data: signal,
        fromUserId: user.uid,
        toUserId: targetUserId,
        timestamp: Date.now()
      };

      await set(signalRef, signalData);
    } catch (error) {
      console.error('Signal gönderme hatası:', error);
    }
  };

  // PTT başlat
  const startPTT = async (): Promise<void> => {
    if (!user || !currentRoom) return;

    try {
      const pttRef = ref(database, `rooms/${currentRoom.id}/ptt`);
      await set(pttRef, {
        isActive: true,
        userId: user.uid,
        username,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('PTT başlatma hatası:', error);
    }
  };

  // PTT durdur
  const stopPTT = async (): Promise<void> => {
    if (!user || !currentRoom) return;

    try {
      const pttRef = ref(database, `rooms/${currentRoom.id}/ptt`);
      await set(pttRef, {
        isActive: false,
        userId: user.uid,
        username,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('PTT durdurma hatası:', error);
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
    joinRoom,
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