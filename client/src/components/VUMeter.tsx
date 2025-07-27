import React from 'react';

interface VUMeterProps {
  level: number; // 0-100 arası ses seviyesi
}

export const VUMeter: React.FC<VUMeterProps> = ({ level }) => {
  // Ses seviyesini yüzdeye çevir (0-100)
  const normalizedLevel = Math.max(0, Math.min(100, level));
  
  // Renk hesaplama
  const getColor = (level: number) => {
    if (level < 30) return '#4CAF50'; // Yeşil
    if (level < 70) return '#FFC107'; // Sarı
    return '#f44336'; // Kırmızı
  };

  return (
    <div style={{ margin: '15px 0' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        <span>🎤 Ses Seviyesi</span>
        <span style={{ opacity: 0.8 }}>
          {normalizedLevel.toFixed(0)}%
        </span>
      </div>
      
      <div className="vu-meter">
        <div 
          className="vu-meter-bar"
          style={{ 
            width: `${normalizedLevel}%`,
            background: `linear-gradient(90deg, 
              #4CAF50 0%, 
              #4CAF50 30%, 
              #FFC107 30%, 
              #FFC107 70%, 
              #f44336 70%, 
              #f44336 100%
            )`,
            filter: normalizedLevel > 0 ? 'none' : 'grayscale(100%)',
            transition: 'width 0.1s ease, filter 0.3s ease'
          }}
        />
      </div>
      
      {/* Seviye etiketleri */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '11px',
        opacity: 0.6,
        marginTop: '4px'
      }}>
        <span>Sessiz</span>
        <span>Normal</span>
        <span>Yüksek</span>
      </div>
      
      {/* Durum mesajı */}
      <div style={{ 
        textAlign: 'center', 
        fontSize: '12px', 
        marginTop: '8px',
        minHeight: '18px',
        color: getColor(normalizedLevel)
      }}>
        {normalizedLevel === 0 && (
          <span style={{ opacity: 0.6 }}>
            Mikrofon kapalı veya ses yok
          </span>
        )}
        {normalizedLevel > 0 && normalizedLevel < 20 && (
          <span>
            🟢 İyi seviye
          </span>
        )}
        {normalizedLevel >= 20 && normalizedLevel < 70 && (
          <span>
            🟡 Orta seviye
          </span>
        )}
        {normalizedLevel >= 70 && (
          <span>
            🔴 Yüksek seviye
          </span>
        )}
      </div>
    </div>
  );
}; 