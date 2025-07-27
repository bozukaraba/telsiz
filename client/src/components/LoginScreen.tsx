import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, roomId: string, password: string, isCreatingRoom: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !roomId.trim() || !password.trim()) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Mikrofon iznini kontrol et
      await navigator.mediaDevices.getUserMedia({ audio: true });
      onLogin(username.trim(), roomId.trim(), password.trim(), isCreatingRoom);
    } catch (error) {
      console.error('Mikrofon izni hatası:', error);
      setError('Bu uygulama için mikrofon iznine ihtiyaç var. Lütfen izin verin.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomRoom = () => {
    const rooms = ['Genel', 'Acil', 'Teknik', 'Operasyon', 'Güvenlik'];
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    setRoomId(randomRoom);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  return (
    <div className="login-container">
      <h1>🔊 Telsiz App</h1>
      <p>Web tabanlı push-to-talk iletişim</p>
      
      {error && (
        <div style={{ 
          color: '#f44336', 
          marginBottom: '20px',
          padding: '10px',
          background: 'rgba(244, 67, 54, 0.1)',
          borderRadius: '5px',
          border: '1px solid rgba(244, 67, 54, 0.3)'
        }}>
          ⚠️ {error}
        </div>
      )}
      
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
              title="Rastgele oda adı"
            >
              🎲
            </button>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="password">Oda Şifresi:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Oda şifresini girin"
              maxLength={20}
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={generateRandomPassword}
              className="btn btn-primary"
              disabled={isLoading}
              style={{ padding: '8px 12px', minWidth: 'auto' }}
              title="Rastgele şifre"
            >
              🔑
            </button>
          </div>
        </div>

        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={isCreatingRoom}
              onChange={(e) => setIsCreatingRoom(e.target.checked)}
              disabled={isLoading}
            />
            <span>Yeni oda oluştur</span>
          </label>
          <small style={{ opacity: 0.7, fontSize: '12px' }}>
            {isCreatingRoom 
              ? 'Yeni bir oda oluşturacaksınız' 
              : 'Mevcut bir odaya katılacaksınız'
            }
          </small>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading || !username.trim() || !roomId.trim() || !password.trim()}
          style={{ width: '100%', marginTop: '20px' }}
        >
          {isLoading 
            ? 'Bağlanıyor...' 
            : isCreatingRoom 
              ? 'Oda Oluştur' 
              : 'Odaya Katıl'
          }
        </button>
      </form>

      <div style={{ marginTop: '30px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
        <p>💡 <strong>Nasıl kullanılır:</strong></p>
        <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <li>Mikrofon izni vermeniz gerekiyor</li>
          <li>Oda oluşturun veya mevcut odaya katılın</li>
          <li>Aynı oda adı ve şifreyi bilen kişilerle konuşabilirsiniz</li>
          <li>Konuşmak için PTT butonuna basın ve basılı tutun</li>
          <li>Butonu bıraktığınızda ses kesilir</li>
        </ul>
      </div>
    </div>
  );
}; 