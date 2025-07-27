import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useWebRTC } from '../contexts/WebRTCContext';
import { PTTButton } from './PTTButton';
import { UsersList } from './UsersList';
import { VUMeter } from './VUMeter';

interface User {
  username: string;
  roomId: string;
}

interface TelsizRoomProps {
  user: User;
  onLogout: () => void;
  onConnectionChange: (connected: boolean) => void;
}

interface RoomUser {
  id: string;
  username: string;
  isSpeaking?: boolean;
}

export const TelsizRoom: React.FC<TelsizRoomProps> = ({ 
  user, 
  onLogout, 
  onConnectionChange 
}) => {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const { audioLevel, remoteStreams } = useWebRTC();
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [speakingUser, setSpeakingUser] = useState<string | null>(null);
  const [connectionTime, setConnectionTime] = useState<Date | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Odaya katıl
  useEffect(() => {
    if (socket && isConnected) {
      joinRoom(user.roomId, user.username);
      setConnectionTime(new Date());
    }
  }, [socket, isConnected, user.roomId, user.username, joinRoom]);

  // Bağlantı durumu değişikliğini bildir
  useEffect(() => {
    onConnectionChange(isConnected);
  }, [isConnected, onConnectionChange]);

  // Socket event dinleyicileri
  useEffect(() => {
    if (!socket) return;

    socket.on('room-joined', (data: { roomId: string; users: RoomUser[] }) => {
      console.log('Odaya katıldı:', data);
      setUsers(data.users);
    });

    socket.on('user-joined', (data: { userId: string; username: string }) => {
      console.log('Yeni kullanıcı:', data);
      setUsers(prev => [...prev, { id: data.userId, username: data.username }]);
    });

    socket.on('user-left', (data: { userId: string; username: string }) => {
      console.log('Kullanıcı ayrıldı:', data);
      setUsers(prev => prev.filter(u => u.id !== data.userId));
      if (speakingUser === data.userId) {
        setSpeakingUser(null);
      }
    });

    socket.on('ptt-started', (data: { userId: string; username: string }) => {
      console.log('PTT başladı:', data);
      setSpeakingUser(data.userId);
      setUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, isSpeaking: true } : { ...u, isSpeaking: false }
      ));
    });

    socket.on('ptt-stopped', (data: { userId: string; username: string }) => {
      console.log('PTT durdu:', data);
      setSpeakingUser(null);
      setUsers(prev => prev.map(u => ({ ...u, isSpeaking: false })));
    });

    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('ptt-started');
      socket.off('ptt-stopped');
    };
  }, [socket, speakingUser]);

  // Remote audio streams
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      if (!audioRefs.current.has(userId)) {
        const audio = new Audio();
        audio.srcObject = stream;
        audio.play().catch(e => console.log('Audio play hatası:', e));
        audioRefs.current.set(userId, audio);
      }
    });

    // Temizlik - artık olmayan streamleri kaldır
    audioRefs.current.forEach((audio, userId) => {
      if (!remoteStreams.has(userId)) {
        audio.pause();
        audio.srcObject = null;
        audioRefs.current.delete(userId);
      }
    });
  }, [remoteStreams]);

  const handleLogout = () => {
    if (socket) {
      leaveRoom();
    }
    
    // Audio elementlerini temizle
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    audioRefs.current.clear();
    
    onLogout();
  };

  const formatConnectionTime = () => {
    if (!connectionTime) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - connectionTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="room-container">
      {/* Durum çubuğu */}
      <div className="status-bar">
        <div className="connection-status">
          <div className={`status-dot ${isConnected ? '' : 'disconnected'}`}></div>
          <span>{isConnected ? 'Bağlı' : 'Bağlantı Kesildi'}</span>
          {connectionTime && <span> • {formatConnectionTime()}</span>}
        </div>
        <button 
          onClick={handleLogout}
          className="btn btn-danger"
          style={{ padding: '6px 12px', fontSize: '14px' }}
        >
          Ayrıl
        </button>
      </div>

      {/* Oda bilgileri */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2>📻 {user.roomId}</h2>
        <p style={{ margin: '5px 0', opacity: 0.8 }}>
          Hoş geldin, <strong>{user.username}</strong>
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px', opacity: 0.6 }}>
          {users.length + 1} kullanıcı çevrimiçi
        </p>
      </div>

      {/* Ses seviyesi göstergesi */}
      <VUMeter level={audioLevel} />

      {/* PTT Butonu */}
      <PTTButton disabled={!isConnected} />

      {/* Konuşan kullanıcı */}
      {speakingUser && (
        <div style={{ 
          margin: '20px 0', 
          padding: '10px', 
          background: 'rgba(76, 175, 80, 0.2)',
          borderRadius: '10px',
          border: '1px solid rgba(76, 175, 80, 0.5)'
        }}>
          🎤 <strong>
            {users.find(u => u.id === speakingUser)?.username || 'Bilinmeyen'} 
          </strong> konuşuyor...
        </div>
      )}

      {/* Kullanıcılar listesi */}
      <UsersList users={users} speakingUserId={speakingUser} />

      {/* Bağlantı durumu uyarısı */}
      {!isConnected && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '10px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          ⚠️ Bağlantı problemi! Yeniden bağlanılıyor...
        </div>
      )}
    </div>
  );
}; 