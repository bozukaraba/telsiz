import React, { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useWebRTC } from '../contexts/WebRTCContext';

interface PTTButtonProps {
  disabled?: boolean;
}

export const PTTButton: React.FC<PTTButtonProps> = ({ disabled = false }) => {
  const { startPTT, stopPTT } = useSocket();
  const { startTransmission, stopTransmission, isTransmitting } = useWebRTC();
  const [isPressed, setIsPressed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePTTStart = useCallback(async () => {
    if (disabled || isPressed) return;
    
    try {
      setError(null);
      await startTransmission();
      startPTT();
      setIsPressed(true);
    } catch (err) {
      console.error('PTT başlatma hatası:', err);
      setError('Mikrofon erişimi reddedildi');
    }
  }, [disabled, isPressed, startTransmission, startPTT]);

  const handlePTTStop = useCallback(() => {
    if (!isPressed) return;
    
    stopTransmission();
    stopPTT();
    setIsPressed(false);
  }, [isPressed, stopTransmission, stopPTT]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handlePTTStart();
  }, [handlePTTStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handlePTTStop();
  }, [handlePTTStop]);

  // Touch events (mobil destek)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handlePTTStart();
  }, [handlePTTStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handlePTTStop();
  }, [handlePTTStop]);

  // Keyboard support (Space tuşu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePTTStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePTTStop();
      }
    };

    if (!disabled) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, handlePTTStart, handlePTTStop]);

  // Mouse leave durumunda PTT'yi durdur
  const handleMouseLeave = useCallback(() => {
    if (isPressed) {
      handlePTTStop();
    }
  }, [isPressed, handlePTTStop]);

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <button
        className={`ptt-button ${isPressed ? 'active' : ''}`}
        disabled={disabled}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        {isPressed ? (
          <>
            🔴<br />
            <span style={{ fontSize: '16px' }}>KONUŞUYOR</span>
          </>
        ) : (
          <>
            🎤<br />
            <span style={{ fontSize: '16px' }}>
              {disabled ? 'BAĞLANTI YOK' : 'BAS VE KONUŞ'}
            </span>
          </>
        )}
      </button>
      
      <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
        {isPressed && isTransmitting && (
          <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>
            📡 Ses iletiyor...
          </div>
        )}
        
        <div style={{ marginTop: '5px' }}>
          💡 Space tuşu veya butona bas ve tut
        </div>
        
        {error && (
          <div style={{ 
            color: '#f44336', 
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(244, 67, 54, 0.1)',
            borderRadius: '5px',
            border: '1px solid rgba(244, 67, 54, 0.3)'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}; 