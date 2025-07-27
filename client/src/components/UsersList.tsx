import React from 'react';

interface RoomUser {
  id: string;
  username: string;
  isSpeaking?: boolean;
}

interface UsersListProps {
  users: RoomUser[];
  speakingUserId: string | null;
}

export const UsersList: React.FC<UsersListProps> = ({ users, speakingUserId }) => {
  if (users.length === 0) {
    return (
      <div className="users-list">
        <h3 style={{ margin: '10px 0', fontSize: '16px' }}>👥 Kullanıcılar</h3>
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          opacity: 0.6,
          fontStyle: 'italic' 
        }}>
          Henüz başka kullanıcı yok
        </div>
      </div>
    );
  }

  return (
    <div className="users-list">
      <h3 style={{ margin: '10px 0', fontSize: '16px' }}>
        👥 Kullanıcılar ({users.length})
      </h3>
      
      {users.map(user => (
        <div 
          key={user.id}
          className={`user-item ${user.isSpeaking || user.id === speakingUserId ? 'user-speaking' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: '#4CAF50',
              flexShrink: 0
            }}></div>
            <span style={{ fontWeight: '500' }}>{user.username}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {(user.isSpeaking || user.id === speakingUserId) && (
              <span style={{ fontSize: '12px', color: '#4CAF50' }}>🎤</span>
            )}
            <span style={{ 
              fontSize: '12px', 
              opacity: 0.7,
              color: user.isSpeaking || user.id === speakingUserId ? '#4CAF50' : 'inherit'
            }}>
              {user.isSpeaking || user.id === speakingUserId ? 'Konuşuyor' : 'Çevrimiçi'}
            </span>
          </div>
        </div>
      ))}
      
      <div style={{ 
        marginTop: '10px', 
        padding: '8px', 
        fontSize: '12px', 
        opacity: 0.6,
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        💡 Konuşan kişi yeşil renkte gösterilir
      </div>
    </div>
  );
}; 