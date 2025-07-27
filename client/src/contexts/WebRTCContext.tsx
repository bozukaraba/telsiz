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
      console.log('🔗 WebRTC: Kullanıcı katıldı:', user.username, 'ID:', user.id);
      try {
        await setupPeerConnection(user.id);
        console.log('✅ WebRTC: Peer connection kuruldu:', user.id);
      } catch (error) {
        console.error('❌ WebRTC: Peer connection hatası:', error);
      }
    });

    // Kullanıcı ayrıldı
    onUserLeft((userId) => {
      console.log('👋 WebRTC: Kullanıcı ayrıldı:', userId);
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
      console.log(`🔗 Peer: ${userId} için connection kuruluyor...`);
      console.log(`📊 Peer: ICE servers count:`, iceServers.length);
      
      const peerConnection = new RTCPeerConnection({
        iceServers
      });

      // ICE candidate eventi
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 Peer: ICE candidate gönderiliyor ${userId}'ye`);
          sendSignal(userId, event.candidate, 'ice-candidate');
        }
      };

      // Remote stream eventi
      peerConnection.ontrack = (event) => {
        console.log(`🎵 Peer: Remote stream alındı ${userId}'den:`, event.streams[0].getTracks().length, 'tracks');
        setRemoteStreams(prev => new Map(prev.set(userId, event.streams[0])));
      };

      // Bağlantı durumu
      peerConnection.onconnectionstatechange = () => {
        console.log(`📡 Peer: Bağlantı durumu [${userId}]:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          console.log(`💔 Peer: Connection failed/disconnected, closing ${userId}`);
          closePeerConnection(userId);
        }
      };

      peerConnections.current.set(userId, peerConnection);
      console.log(`✅ Peer: ${userId} peer connection map'e eklendi. Toplam:`, peerConnections.current.size);

      // Local stream varsa ekle
      if (localStream) {
        console.log(`🎤 Peer: Local stream mevcut, ${userId}'ye track'ler ekleniyor...`);
        localStream.getTracks().forEach(track => {
          console.log(`➡️ Peer: Track ekleniyor ${userId}'ye:`, track.kind);
          peerConnection.addTrack(track, localStream);
        });

        // Offer oluştur ve gönder
        console.log(`📞 Peer: ${userId} için offer oluşturuluyor...`);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal(userId, offer, 'offer');
        console.log(`✅ Peer: Offer gönderildi ${userId}'ye`);
      } else {
        console.log(`⚠️ Peer: Local stream yok, ${userId} için track eklenemiyor`);
      }
    } catch (error) {
      console.error(`❌ Peer: ${userId} connection kurulum hatası:`, error);
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
      console.log('🎤 PTT: Transmission başlatılıyor...');
      console.log('🔗 PTT: Mevcut peer connections:', peerConnections.current.size);
      
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

      console.log('🎧 PTT: Mikrofon erişimi isteniyor...');
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      console.log('✅ PTT: Mikrofon erişimi başarılı, track count:', stream.getTracks().length);
      
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
        console.log('🔊 PTT: AudioContext ve analyser kuruldu');
      } catch (audioError) {
        console.warn('⚠️ PTT: AudioContext kurulum hatası:', audioError);
        // AudioContext olmadan da devam et
      }

      // Mevcut peer bağlantılarına track ekle
      const peerConnectionCount = peerConnections.current.size;
      console.log(`📡 PTT: ${peerConnectionCount} peer connection'a track ekleniyor...`);
      
      stream.getTracks().forEach(track => {
        console.log('🎵 PTT: Track ekleniyor:', track.kind, track.id);
        peerConnections.current.forEach((peerConnection, userId) => {
          console.log(`➡️ PTT: Track ekleniyor peer ${userId}'ye:`, peerConnection.connectionState);
          peerConnection.addTrack(track, stream);
        });
      });
      
      console.log('✅ PTT: Transmission başarıyla başlatıldı!');

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
    console.log('🛑 PTT: Transmission durduruluyor...');
    
    if (localStream) {
      console.log('🎤 PTT: Local stream trackleri durduruluyor...');
      localStream.getTracks().forEach(track => {
        console.log('⏹️ PTT: Track durduruluyor:', track.kind, track.id);
        track.stop();
      });
      setLocalStream(null);
    }

    if (audioContext.current) {
      console.log('🔊 PTT: AudioContext kapatılıyor...');
      audioContext.current.close();
      audioContext.current = null;
    }

    if (animationFrame.current) {
      console.log('🎛️ PTT: Animation frame iptal ediliyor...');
      cancelAnimationFrame(animationFrame.current);
    }

    setIsTransmitting(false);
    setAudioLevel(0);
    console.log('✅ PTT: Transmission başarıyla durduruldu');
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