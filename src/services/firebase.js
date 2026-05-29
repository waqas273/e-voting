import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDA-o8PqL--3vjtMnAz1YHF2lCIpZ5Umog",
  authDomain: "e-voting-system-ae1b4.firebaseapp.com",
  projectId: "e-voting-system-ae1b4",
  storageBucket: "e-voting-system-ae1b4.firebasestorage.app",
  messagingSenderId: "671155767518",
  appId: "1:671155767518:web:e052423af2088b7ffbda4f",
  measurementId: "G-T6TXQ4MX7Z"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
