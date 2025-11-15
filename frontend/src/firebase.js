// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, getIdTokenResult, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, setDoc, serverTimestamp, onSnapshot, limit } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// TODO: Replace the following with your app's Firebase project configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app); // Initialize Cloud Functions

// Export Firebase services and functions
export {
  auth,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onAuthStateChanged,
  httpsCallable,
  functions,
  getIdTokenResult,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  setDoc,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signOut,
  onSnapshot,
  limit,
};
