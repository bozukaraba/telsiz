import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketContext';
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
  const { socket, sendSignal } = useSocket();
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

  // Socket event dinleyicileri
  useEffect(() => {
    if (!socket) return;

    socket.on('user-joined', async (data: { userId: string; username: string }) => {
      console.log('Kullanıcı katıldı:', data.username);
      await setupPeerConnection(data.userId);
    });

    socket.on('user-left', (data: { userId: string; username: string }) => {
      console.log('Kullanıcı ayrıldı:', data.username);
      closePeerConnection(data.userId);
    });

    socket.on('signal', async (data: { fromUserId: string; signal: any; type: string }) => {
      const peerConnection = peerConnections.current.get(data.fromUserId);
      if (!peerConnection) return;

      try {
        if (data.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sendSignal(data.fromUserId, answer, 'answer');
        } else if (data.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.type === 'ice-candidate') {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
        }
      } catch (error) {
        console.error('Signal işleme hatası:', error);
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('signal');
    };
  }, [socket, sendSignal]);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      setLocalStream(stream);
      setIsTransmitting(true);

      // Audio context ve analyser kurulumu
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);

      updateAudioLevel();

      // Mevcut peer bağlantılarına track ekle
      stream.getTracks().forEach(track => {
        peerConnections.current.forEach(peerConnection => {
          peerConnection.addTrack(track, stream);
        });
      });

    } catch (error) {
      console.error('Mikrofon erişim hatası:', error);
      throw error;
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