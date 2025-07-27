import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase config - Firebase Console'dan alınacak
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "telsiz-94582.firebaseapp.com",
  databaseURL: "https://telsiz-94582-default-rtdb.firebaseio.com",
  projectId: "telsiz-94582",
  storageBucket: "telsiz-94582.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firebase servisleri
export const database = getDatabase(app);
export const auth = getAuth(app);
export default app; 