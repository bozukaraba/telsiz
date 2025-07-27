import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, roomId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !roomId.trim()) {
      alert('Lütfen kullanıcı adı ve oda adı girin');
      return;
    }

    setIsLoading(true);
    
    try {
      // Mikrofon iznini kontrol et
      await navigator.mediaDevices.getUserMedia({ audio: true });
      onLogin(username.trim(), roomId.trim());
    } catch (error) {
      console.error('Mikrofon izni hatası:', error);
      alert('Bu uygulama için mikrofon iznine ihtiyaç var. Lütfen izin verin.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomRoom = () => {
    const rooms = ['Genel', 'Acil', 'Teknik', 'Operasyon', 'Güvenlik'];
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    setRoomId(randomRoom);
  };

  return (
    <div className="login-container">
      <h1>🔊 Telsiz App</h1>
      <p>Web tabanlı push-to-talk iletişim</p>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="username">Kullanıcı Adı:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Adınızı girin"
            maxLength={20}
            disabled={isLoading}
          />
        </div>

        <div className="input-group">
          <label htmlFor="roomId">Oda Adı:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Oda adını girin"
              maxLength={30}
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={generateRandomRoom}
              className="btn btn-primary"
              disabled={isLoading}
              style={{ padding: '8px 12px', minWidth: 'auto' }}
            >
              🎲
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading || !username.trim() || !roomId.trim()}
          style={{ width: '100%', marginTop: '20px' }}
        >
          {isLoading ? 'Bağlanıyor...' : 'Odaya Katıl'}
        </button>
      </form>

      <div style={{ marginTop: '30px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
        <p>💡 <strong>Nasıl kullanılır:</strong></p>
        <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <li>Mikrofon izni vermeniz gerekiyor</li>
          <li>Aynı oda adını giren kişilerle iletişim kurabilirsiniz</li>
          <li>Konuşmak için PTT butonuna basın ve basılı tutun</li>
          <li>Butonu bıraktığınızda ses kesilir</li>
        </ul>
      </div>
    </div>
  );
}; 