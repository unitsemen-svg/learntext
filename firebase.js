// ВСТАВЬ СЮДА СВОЙ КОД ИЗ FIREBASE (Project Settings -> General -> Your apps -> </>)
const firebaseConfig = {
  apiKey: "ТВОЙ_API_KEY",
  authDomain: "ТВОЙ_ПРОЕКТ.firebaseapp.com",
  projectId: "ТВОЙ_ПРОЕКТ",
  storageBucket: "ТВОЙ_ПРОЕКТ.appspot.com",
  messagingSenderId: "ТВОЙ_ID",
  appId: "ТВОЙ_APP_ID"
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
