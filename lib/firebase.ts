// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaKoHAf1qdl6EJAoI10W_rpa0dfClDLBg",
  authDomain: "website-vamx.firebaseapp.com",
  projectId: "website-vamx",
  storageBucket: "website-vamx.firebasestorage.app",
  messagingSenderId: "374823006787",
  appId: "1:374823006787:web:36ae604256dd30d9b15af6",
  measurementId: "G-45BMCVTVFH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
