// ВСТАВЬ СЮДА СВОЙ КОД ИЗ FIREBASE (Project Settings -> General -> Your apps -> </>)
const firebaseConfig = {
  apiKey: "AIzaSyAgn_ddh5FfYTjVEhAk63ofdYOuDFb6yn4",
  authDomain: "learntext-e3c3d.firebaseapp.com",
  projectId: "learntext-e3c3d",
  storageBucket: "learntext-e3c3d.firebasestorage.app",
  messagingSenderId: "331950558496",
  appId: "1:331950558496:web:d9fd6575188b15ab2b1b45",
  measurementId: "G-ZXFEVV7EJZ"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Передаем инструменты в основной файл app.js
window.firebaseTools = {
  auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  doc, setDoc, getDoc
};
