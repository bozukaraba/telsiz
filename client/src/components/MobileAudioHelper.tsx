import React, { useState, useEffect } from 'react';

interface MobileAudioHelperProps {
  onPermissionGranted: () => void;
  onPermissionDenied: (error: string) => void;
}

export const MobileAudioHelper: React.FC<MobileAudioHelperProps> = ({ 
  onPermissionGranted, 
  onPermissionDenied 
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    // Mobil cihaz kontrolü
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    console.log('📱 Audio Helper: Mobil cihaz:', isMobile);
    console.log('🍎 Audio Helper: iOS Safari:', isIOSSafari);
    console.log('🔒 Audio Helper: Protocol:', window.location.protocol);
    console.log('🌐 Audio Helper: Hostname:', window.location.hostname);
    
    // Her mobil cihazda yardım göster
    if (isMobile) {
      setShowHelper(true);
    }
  }, []);

  const requestMicrophonePermission = async () => {
    if (isRequesting) return;
    
    setIsRequesting(true);
    
    try {
      console.log('🎤 Audio Helper: Mikrofon izni isteniyor...');
      
      // HTTPS kontrolü
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Mikrofon erişimi için HTTPS gerekli');
      }

      // Basit audio constraint (mobil uyumluluk için)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      console.log('✅ Audio Helper: Mikrofon izni alındı');
      
      // Test stream'i hemen kapat
      stream.getTracks().forEach(track => track.stop());
      
      setShowHelper(false);
      onPermissionGranted();
      
    } catch (error: any) {
      console.error('❌ Audio Helper: Mikrofon izni hatası:', error);
      
      let errorMessage = 'Mikrofon izni alınamadı. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'İzin reddedildi. Tarayıcı ayarlarından mikrofon iznini verin.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Mikrofon bulunamadı.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Bu tarayıcı mikrofon erişimini desteklemiyor.';
      } else {
        errorMessage += error.message;
      }
      
      onPermissionDenied(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!showHelper) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>
          Mikrofon İzni Gerekli
        </h3>
        <p style={{ 
          marginBottom: '25px', 
          color: '#666',
          lineHeight: '1.5'
        }}>
          Telsiz özelliğini kullanmak için mikrofon iznine ihtiyacımız var. 
          Aşağıdaki butona tıkladıktan sonra tarayıcının izin isteğini onaylayın.
        </p>
        
        <button
          onClick={requestMicrophonePermission}
          disabled={isRequesting}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isRequesting ? 'not-allowed' : 'pointer',
            opacity: isRequesting ? 0.6 : 1,
            width: '100%'
          }}
        >
          {isRequesting ? '🔄 İzin isteniyor...' : '🎤 Mikrofon İznini Ver'}
        </button>
        
        <div style={{ 
          marginTop: '15px', 
          fontSize: '12px', 
          color: '#999' 
        }}>
          💡 iOS Safari: Ayarlar → Safari → Kamera ve Mikrofon
        </div>
      </div>
    </div>
  );
}; 