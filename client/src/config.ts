// Uygulama konfigürasyonu
const isDevelopment = window.location.hostname === 'localhost';

export const config = {
  // Backend server URL
  serverUrl: isDevelopment 
    ? 'http://localhost:3001'         // Development
    : 'https://your-backend-url.com', // Production backend URL'ini buraya koy
  
  // WebRTC konfigürasyonu
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN sunucusu eklenebilir
    // { 
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'user',
    //   credential: 'pass'
    // }
  ],
  
  // Uygulama ayarları
  app: {
    name: 'Telsiz App',
    version: '1.0.0',
    maxUsersPerRoom: 10,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100
    }
  }
}; 