import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
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
} from '../services/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  tier?: string;
  token?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  updateUserLocal: (displayName: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'hissaby_auth_user';

function formatFirebaseError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please check your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled yet in your Firebase Console.';
    case 'auth/unauthorized-domain':
      return "Domain not authorized. Please verify 'localhost' is added under Firebase Console -> Authentication -> Settings -> Authorized Domains.";
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled. The Google popup was closed.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const clearAuthError = () => setAuthError(null);

  // 1. Listen to Firebase Auth state & redirect results
  useEffect(() => {
    let isMounted = true;

    const initAuthListener = async () => {
      if (!auth) return;

      try {
        const redirectRes = await getRedirectResult(auth);
        if (redirectRes?.user && isMounted) {
          const idToken = await redirectRes.user.getIdToken();
          const u: UserProfile = {
            uid: redirectRes.user.uid,
            email: redirectRes.user.email || '',
            displayName: redirectRes.user.displayName || redirectRes.user.email?.split('@')[0] || 'User',
            photoURL: redirectRes.user.photoURL || undefined,
            tier: 'Google Verified',
            token: idToken
          };
          setUser(u);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
          setIsAuthModalOpen(false);
        }
      } catch (err: any) {
        console.warn('Redirect result warning:', err);
      }

      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!isMounted) return;
        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            const u: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              photoURL: fbUser.photoURL || undefined,
              tier: 'Verified',
              token: idToken
            };
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
          } catch {
            // ignore
          }
        }
      });

      return () => unsubscribe();
    };

    initAuthListener();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Continue with Google Authentication
  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);

    if (!auth || !googleProvider) {
      setAuthError(
        "Firebase Web API Key is missing in frontend/.env. Please paste VITE_FIREBASE_API_KEY from Firebase Console -> Project Settings -> General -> Web API Key."
      );
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const u: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        photoURL: result.user.photoURL || undefined,
        tier: 'Google Verified',
        token: idToken
      };
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setIsAuthModalOpen(false);
    } catch (err: any) {
      // If popup was blocked by browser or failed, attempt redirection
      if (err?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setAuthError(formatFirebaseError(redirectErr));
        }
      } else {
        setAuthError(formatFirebaseError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Sign In
  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError(null);

    if (!auth) {
      setAuthError(
        "Firebase Web API Key is missing in frontend/.env. Please add VITE_FIREBASE_API_KEY from Firebase Console."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const idToken = await res.user.getIdToken();
      const u: UserProfile = {
        uid: res.user.uid,
        email: res.user.email || email.trim(),
        displayName: res.user.displayName || email.split('@')[0],
        photoURL: res.user.photoURL || undefined,
        tier: 'Email Verified',
        token: idToken
      };
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // 4. Email & Password Registration (Sign Up)
  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    setAuthError(null);

    if (!auth) {
      setAuthError(
        "Firebase Web API Key is missing in frontend/.env. Please add VITE_FIREBASE_API_KEY from Firebase Console."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name && name.trim()) {
        try {
          await updateProfile(res.user, { displayName: name.trim() });
        } catch {
          // ignore
        }
      }
      const idToken = await res.user.getIdToken();
      const u: UserProfile = {
        uid: res.user.uid,
        email: res.user.email || email.trim(),
        displayName: name?.trim() || email.split('@')[0],
        photoURL: res.user.photoURL || undefined,
        tier: 'Email Verified',
        token: idToken
      };
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch {
        // ignore
      }
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const openAuthModal = () => {
    setAuthError(null);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const updateUserLocal = async (displayName: string, email?: string) => {
    if (!user) return;
    if (auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName });
      } catch (err) {
        console.warn("Failed to update Firebase profile display name:", err);
      }
    }
    const updated = {
      ...user,
      displayName,
      email: email || user.email,
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        clearAuthError,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        updateUserLocal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
