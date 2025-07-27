import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase config - Firebase Console'dan alındı
const firebaseConfig = {
  apiKey: "AIzaSyAQBRdArgAmCM2BTWuwMhV2iBpI7yFusGs",
  authDomain: "telsiz-94582.firebaseapp.com",
  databaseURL: "https://telsiz-94582-default-rtdb.firebaseio.com",
  projectId: "telsiz-94582",
  storageBucket: "telsiz-94582.firebasestorage.app",
  messagingSenderId: "847987518070",
  appId: "1:847987518070:web:1995466b94d767739a4d57"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firebase servisleri
export const database = getDatabase(app);
export const auth = getAuth(app);
export default app; 