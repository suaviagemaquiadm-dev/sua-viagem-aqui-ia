// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, getIdTokenResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, addDoc, serverTimestamp, arrayRemove, arrayUnion, collectionGroup, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAzrZ-gVFJXCevpEkKHht3dn9RLCRdo2h0",
    authDomain: "gemini-cli-98f4a.firebaseapp.com",
    projectId: "gemini-cli-98f4a",
    storageBucket: "gemini-cli-98f4a.appspot.com",
    messagingSenderId: "1065949512661",
    appId: "1:1065949512661:web:57d184d86a82438511f35c",
    measurementId: "G-CHE4S36RY3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'southamerica-east1');
const storage = getStorage(app);

// Export Firebase services and functions for use in other modules
export { 
    app, 
    auth, 
    db, 
    functions,
    storage,
    // Auth
    onAuthStateChanged,
    signOut,
    getIdTokenResult,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    fetchSignInMethodsForEmail,
    // Firestore
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp,
    arrayRemove,
    arrayUnion,
    collectionGroup,
    setDoc,
    // Functions
    httpsCallable,
    // Storage
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
};
