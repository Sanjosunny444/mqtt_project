// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";


const {
REACT_APP_FIREBASE_API_KEY,
REACT_APP_FIREBASE_AUTH_DOMAIN,
REACT_APP_FIREBASE_DATABASE_URL,
REACT_APP_FIREBASE_PROJECT_ID,
REACT_APP_FIREBASE_STORAGE_BUCKET,
REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
REACT_APP_FIREBASE_APP_ID,
} = process.env;
// Firebase configuration
const firebaseConfig = {
    apiKey: REACT_APP_FIREBASE_API_KEY,
    authDomain: REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: REACT_APP_FIREBASE_DATABASE_URL,
    projectId: REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: REACT_APP_FIREBASE_APP_ID,
    measurementId: "G-STB0YSP3SM"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };