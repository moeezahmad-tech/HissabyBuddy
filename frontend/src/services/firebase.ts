import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  type Auth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAZ2msZaJYQMWeli6QYd1N1F8CPb-Fc0JM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "finsight-ai-e692d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "finsight-ai-e692d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "finsight-ai-e692d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "351939542536",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:351939542536:web:433c42fead3c99f13a1bbd"
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  app, 
  auth, 
  googleProvider, 
  signInWithPopup,
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut 
};
