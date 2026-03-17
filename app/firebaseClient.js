// UCL, Bartlett, RC5
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTYfqsAgx8Hpsm-oOLv_pK9eIkIVSrAlA",
  authDomain: "bookshelf-58d60.firebaseapp.com",
  projectId: "bookshelf-58d60",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const AuthApi = {
  onAuthStateChanged,
  signInWithGoogle: () => signInWithPopup(auth, googleProvider),
  signInAnonymously: () => signInAnonymously(auth),
  signOut: () => signOut(auth),
};