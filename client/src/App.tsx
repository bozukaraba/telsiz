import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { TelsizRoom } from './components/TelsizRoom';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { WebRTCProvider } from './contexts/WebRTCContext';
import './App.css';

interface User {
  username: string;
  roomId: string;
  password: string;
  isCreatingRoom: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAutoRecovering, setIsAutoRecovering] = useState(true);

  // Sayfa yüklendiğinde session'ı otomatik geri yükle
  useEffect(() => {
    const recoverSession = async () => {
      try {
        const savedSession = localStorage.getItem('telsiz_session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // 24 saat içindeki session'ları kabul et
          if (Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000) {
            console.log('🔄 Session geri yükleniyor...', sessionData.roomId);
            setUser({
              username: sessionData.username,
              roomId: sessionData.roomId,
              password: sessionData.password,
              isCreatingRoom: false // Session recovery'de her zaman join yap
            });
          } else {
            // Eski session'ı sil
            localStorage.removeItem('telsiz_session');
          }
        }
      } catch (error) {
        console.error('Session recovery hatası:', error);
        localStorage.removeItem('telsiz_session');
      } finally {
        setIsAutoRecovering(false);
      }
    };

    recoverSession();
  }, []);

  const handleLogin = (username: string, roomId: string, password: string, isCreatingRoom: boolean) => {
    setUser({ username, roomId, password, isCreatingRoom });
  };

  const handleLogout = () => {
    // Session'ı temizle
    localStorage.removeItem('telsiz_session');
    setUser(null);
    setIsConnected(false);
  };

  // Session recovery yüklenirken loading göster
  if (isAutoRecovering) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          gap: '20px'
        }}>
          <div style={{ fontSize: '48px' }}>📡</div>
          <div style={{ fontSize: '18px', opacity: 0.8 }}>Session geri yükleniyor...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <FirebaseProvider>
          <WebRTCProvider>
            <TelsizRoom 
              user={user} 
              onLogout={handleLogout}
              onConnectionChange={setIsConnected}
            />
          </WebRTCProvider>
        </FirebaseProvider>
      )}
    </div>
  );
}

export default App; 