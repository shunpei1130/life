import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';

let cachedApp: FirebaseApp | null = null;

function buildConfig(): FirebaseOptions {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  } as FirebaseOptions;
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  const config = buildConfig();
  const requiredKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = requiredKeys.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration values: ${missing.join(', ')}`);
  }

  cachedApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
  return cachedApp;
}
