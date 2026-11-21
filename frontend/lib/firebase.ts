import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Local development only: set NEXT_PUBLIC_AUTH_DISABLED=true (and AUTH_DISABLED=true
// on the backend) to run without signing in.
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

/** The signed-in user's ID token, or null when signed out / auth disabled. */
export async function getIdToken(): Promise<string | null> {
  if (AUTH_DISABLED || typeof window === "undefined") return null;
  const user = getFirebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}
