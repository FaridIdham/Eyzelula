import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

// Reuse existing Firebase app instance if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Workspace Scopes configured in OAuth
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({ prompt: 'consent' });

// In-memory token caching (NOT stored in localStorage as per security standards)
let cachedAccessToken: string | null = null;
let isSigningIn = false;
let activeSignInPromise: Promise<{ user: User; accessToken: string; profile: UserProfile } | null> | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged in on Firebase but access token is not in memory,
        // will request user to sign in when making Google Workspace API calls
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; profile: UserProfile } | null> => {
  // If an active popup authentication request is already in-flight, return the existing promise.
  // This completely eliminates "auth/cancelled-popup-request" caused by rapid multiple clicks or concurrent calls.
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error('Gagal mendapatkan token akses dari autentikasi Google.');
      }

      cachedAccessToken = credential.accessToken;
      const profile: UserProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL
      };

      return {
        user: result.user,
        accessToken: cachedAccessToken,
        profile
      };
    } catch (error: any) {
      // Gracefully handle standard user cancellation without throwing or logging console errors
      if (
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-closed-by-user'
      ) {
        return null;
      }

      if (error?.code === 'auth/popup-blocked') {
        const customErr = new Error('Jendela popup otorisasi Google diblokir oleh browser. Harap izinkan popup di peramban Anda atau buka aplikasi di tab baru.');
        (customErr as any).code = 'auth/popup-blocked';
        throw customErr;
      }

      throw error;
    } finally {
      isSigningIn = false;
      activeSignInPromise = null;
    }
  })();

  return activeSignInPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
