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

  const handleLogin = (username: string, roomId: string, password: string, isCreatingRoom: boolean) => {
    setUser({ username, roomId, password, isCreatingRoom });
  };

  const handleLogout = () => {
    setUser(null);
    setIsConnected(false);
  };

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