// =============================================================================
// Firebase configuration for the Bhasme Sir Coaching Center student portal.
//
// TODO: replace with the real Firebase config from the Firebase console
//   (Project settings -> General -> Your apps -> SDK setup and configuration).
//
// NOTE ON SECRETS: the Firebase Web `apiKey` below is NOT a secret. It is a
// public client identifier used to route requests to your Firebase project and
// is safe to ship in client-side code / commit to a public repo. Access is
// controlled by Firebase Authentication + Firestore Security Rules, NOT by the
// apiKey. Do NOT, however, ever place private keys or service-account
// credentials (the JSON files from "Service accounts") in this or any other
// client file — those are real secrets.
// =============================================================================

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Real Firebase config for the "bhasme-sir-coaching-center" project.
export const firebaseConfig = {
  apiKey: "AIzaSyCtBI44MxfvqycVO7gaNbeitaMAYyYOIs8",
  authDomain: "bhasme-sir-coaching-center.firebaseapp.com",
  projectId: "bhasme-sir-coaching-center",
  storageBucket: "bhasme-sir-coaching-center.firebasestorage.app",
  messagingSenderId: "142992845341",
  appId: "1:142992845341:web:8b828c0b06031d780d34f4",
  measurementId: "G-LBX0C6RK4X"
};

// Initialize Firebase and export the shared instances used across the portal.
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary Auth — in-memory only so student provisioning never touches admin session.
var provisionApp = getApps().some(function (a) { return a.name === "bccProvision"; })
  ? getApp("bccProvision")
  : initializeApp(firebaseConfig, "bccProvision");
var provisionAuth;
try {
  provisionAuth = initializeAuth(provisionApp, { persistence: inMemoryPersistence });
} catch (e) {
  provisionAuth = getAuth(provisionApp);
}
export { provisionApp, provisionAuth };
