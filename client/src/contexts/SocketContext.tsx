import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string, username: string) => void;
  leaveRoom: () => void;
  sendSignal: (targetUserId: string, signal: any, type: 'offer' | 'answer' | 'ice-candidate') => void;
  startPTT: () => void;
  stopPTT: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket hook Socket Provider içinde kullanılmalı');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(config.serverUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket bağlandı:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket bağlantısı kesildi');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası:', error);
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = (roomId: string, username: string) => {
    if (socket) {
      socket.emit('join-room', { roomId, username });
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room');
    }
  };

  const sendSignal = (targetUserId: string, signal: any, type: 'offer' | 'answer' | 'ice-candidate') => {
    if (socket) {
      socket.emit('signal', { targetUserId, signal, type });
    }
  };

  const startPTT = () => {
    if (socket) {
      socket.emit('ptt-start');
    }
  };

  const stopPTT = () => {
    if (socket) {
      socket.emit('ptt-stop');
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendSignal,
    startPTT,
    stopPTT
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 