import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { TelsizRoom } from './components/TelsizRoom';
import { SocketProvider } from './contexts/SocketContext';
import { WebRTCProvider } from './contexts/WebRTCContext';
import './App.css';

interface User {
  username: string;
  roomId: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleLogin = (username: string, roomId: string) => {
    setUser({ username, roomId });
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
        <SocketProvider>
          <WebRTCProvider>
            <TelsizRoom 
              user={user} 
              onLogout={handleLogout}
              onConnectionChange={setIsConnected}
            />
          </WebRTCProvider>
        </SocketProvider>
      )}
    </div>
  );
}

export default App; 