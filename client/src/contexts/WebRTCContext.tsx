import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useFirebase } from './FirebaseContext';
import { config } from '../config';

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
}

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  audioLevel: number;
  isTransmitting: boolean;
  startTransmission: () => Promise<void>;
  stopTransmission: () => void;
  setupPeerConnection: (userId: string) => Promise<void>;
  closePeerConnection: (userId: string) => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error('useWebRTC hook WebRTC Provider içinde kullanılmalı');
  }
  return context;
};

interface WebRTCProviderProps {
  children: React.ReactNode;
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
  const { sendSignal, onSignalReceived, onUserJoined, onUserLeft } = useFirebase();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number>();

  // ICE sunucularını al
  useEffect(() => {
    fetch('/api/ice-servers')
      .then(res => res.json())
      .then(data => {
        setIceServers(data.iceServers);
      })
      .catch(err => {
        console.error('ICE sunucuları alınamadı:', err);
        // Varsayılan STUN sunucuları
        setIceServers(config.iceServers);
      });
  }, []);

  // Firebase event dinleyicileri
  useEffect(() => {
    // Kullanıcı katıldı
    onUserJoined(async (user) => {
      console.log('Kullanıcı katıldı:', user.username);
      await setupPeerConnection(user.id);
    });

    // Kullanıcı ayrıldı
    onUserLeft((userId) => {
      console.log('Kullanıcı ayrıldı:', userId);
      closePeerConnection(userId);
    });

    // Signal alındı
    onSignalReceived(async (signal) => {
      const peerConnection = peerConnections.current.get(signal.fromUserId);
      if (!peerConnection) return;

      try {
        if (signal.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sendSignal(signal.fromUserId, answer, 'answer');
        } else if (signal.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
        } else if (signal.type === 'ice-candidate') {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
        }
      } catch (error) {
        console.error('Signal işleme hatası:', error);
      }
    });
  }, [sendSignal, onUserJoined, onUserLeft, onSignalReceived]);

  // Audio level monitoring
  const updateAudioLevel = () => {
    if (!analyser.current) return;

    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    setAudioLevel(average / 255 * 100);

    animationFrame.current = requestAnimationFrame(updateAudioLevel);
  };

  const setupPeerConnection = async (userId: string): Promise<void> => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers
      });

      // ICE candidate eventi
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(userId, event.candidate, 'ice-candidate');
        }
      };

      // Remote stream eventi
      peerConnection.ontrack = (event) => {
        console.log('Remote stream alındı:', userId);
        setRemoteStreams(prev => new Map(prev.set(userId, event.streams[0])));
      };

      // Bağlantı durumu
      peerConnection.onconnectionstatechange = () => {
        console.log(`Peer bağlantı durumu [${userId}]:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          closePeerConnection(userId);
        }
      };

      peerConnections.current.set(userId, peerConnection);

      // Local stream varsa ekle
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Offer oluştur ve gönder
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal(userId, offer, 'offer');
      }
    } catch (error) {
      console.error('Peer connection kurulum hatası:', error);
    }
  };

  const closePeerConnection = (userId: string) => {
    const peerConnection = peerConnections.current.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.current.delete(userId);
    }
    
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  const startTransmission = async (): Promise<void> => {
    try {
      // Mobil cihazlar için gelişmiş mikrofon ayarları
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Mobil optimizasyonları
          channelCount: 1,
          sampleRate: { ideal: 44100, min: 16000 },
          sampleSize: 16,
          latency: { ideal: 0.01, max: 0.05 }
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      setLocalStream(stream);
      setIsTransmitting(true);

      // Audio context kurulumu - mobil uyumlu
      try {
        // AudioContext'i user gesture ile başlat
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Mobil Safari için suspend durumunu kontrol et
        if (audioContext.current.state === 'suspended') {
          await audioContext.current.resume();
        }
        
        const source = audioContext.current.createMediaStreamSource(stream);
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 256;
        analyser.current.smoothingTimeConstant = 0.8;
        source.connect(analyser.current);

        updateAudioLevel();
      } catch (audioError) {
        console.warn('AudioContext kurulum hatası:', audioError);
        // AudioContext olmadan da devam et
      }

      // Mevcut peer bağlantılarına track ekle
      stream.getTracks().forEach(track => {
        peerConnections.current.forEach(peerConnection => {
          peerConnection.addTrack(track, stream);
        });
      });

    } catch (error: any) {
      console.error('Mikrofon erişim hatası:', error);
      
      // Mobil cihazlarda daha açıklayıcı hata mesajları
      if (error.name === 'NotAllowedError') {
        throw new Error('Mikrofon izni reddedildi. Tarayıcı ayarlarından izin verin.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('Mikrofon bulunamadı. Cihazınızın mikrofonunu kontrol edin.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Mikrofon ayarları cihazınızla uyumsuz.');
      } else {
        throw new Error('Mikrofon erişim hatası: ' + error.message);
      }
    }
  };

  const stopTransmission = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    setIsTransmitting(false);
    setAudioLevel(0);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopTransmission();
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, []);

  const value: WebRTCContextType = {
    localStream,
    remoteStreams,
    audioLevel,
    isTransmitting,
    startTransmission,
    stopTransmission,
    setupPeerConnection,
    closePeerConnection
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
}; 