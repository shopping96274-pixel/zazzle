import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Configuration priority:
// 1. Vite environment variables (VITE_FIREBASE_*) - essential for Vercel/GitHub deployments
// 2. Bundled firebase-applet-config.json - provided automatically by AI Studio
export const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    firebaseConfigJson.apiKey ||
    'AIzaSyBgbOOH3QmUnl6NCgmm4h-k8NemJBSjylM',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    firebaseConfigJson.authDomain ||
    'zazzel-shopping-store-c7bc8.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    firebaseConfigJson.projectId ||
    'zazzel-shopping-store-c7bc8',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseConfigJson.storageBucket ||
    'zazzel-shopping-store-c7bc8.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfigJson.messagingSenderId ||
    '646343495494',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    firebaseConfigJson.appId ||
    '1:646343495494:web:fe9a31ff8f56a05fc49f47',
};

export const FIRESTORE_DATABASE_ID =
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  firebaseConfigJson.firestoreDatabaseId ||
  '(default)';

// Initialize singletons
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Silence internal Firestore SDK connection retry warnings so transient network state transitions
// do not trigger false-positive console error intercepts in preview iframes
try {
  setLogLevel('silent');
} catch {}

// Auth instance
export const auth: Auth = getAuth(app);

// Firestore instance (with databaseId support if custom, or default)
// Initialize with experimentalAutoDetectLongPolling and extended timeout to allow fast streaming
// WebChannel connections first, seamlessly falling back to long-polling only when required.
let firestoreDb: Firestore;
try {
  const settings = {
    experimentalAutoDetectLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 30,
    },
  };
  firestoreDb =
    FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
      ? initializeFirestore(app, settings, FIRESTORE_DATABASE_ID)
      : initializeFirestore(app, settings);
} catch {
  firestoreDb =
    FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
      ? getFirestore(app, FIRESTORE_DATABASE_ID)
      : getFirestore(app);
}

export const db: Firestore = firestoreDb;

// Storage instance
export const storage: FirebaseStorage = getStorage(app);

export default app;
