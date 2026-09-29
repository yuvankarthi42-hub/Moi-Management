import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { Platform } from 'react-native';

/**
 * The Firebase app, built from the environment.
 *
 * These values are public by design — they identify the project, they do not
 * grant anything. Access is decided by Firebase's own rules and, for our data,
 * by the `user_id` scope on every query. Read them from the environment rather
 * than hard-coding so a second project (a staging one, say) needs no edit.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseApp(): FirebaseApp {
  if (!config.apiKey) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env.local and fill it in.',
    );
  }
  // Expo Fast Refresh re-runs modules, and initializing twice throws.
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

/**
 * Auth, with persistence that suits the platform.
 *
 * On the web the default (IndexedDB, falling back to localStorage) is right.
 * On iOS and Android there is no such store, so Firebase has to be handed
 * AsyncStorage explicitly or the session is lost on every restart.
 */
export function firebaseAuth() {
  const app = firebaseApp();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const auth = require('firebase/auth') as typeof import('firebase/auth');

  if (Platform.OS === 'web') return auth.getAuth(app);

  try {
    // `getReactNativePersistence` only exists in the React Native build, so it
    // is reached through the same runtime require rather than a static import
    // that the web bundle would fail to resolve.
    const rnPersistence = (auth as unknown as {
      getReactNativePersistence?: (store: unknown) => unknown;
    }).getReactNativePersistence;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (rnPersistence) {
      return auth.initializeAuth(app, {
        persistence: rnPersistence(AsyncStorage) as never,
      });
    }
    return auth.getAuth(app);
  } catch {
    // initializeAuth throws if it has already run — Fast Refresh again.
    return auth.getAuth(app);
  }
}
