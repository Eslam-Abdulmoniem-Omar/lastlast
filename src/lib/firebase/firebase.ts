import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCCfI4oijaBGAMrxrMhUaPydNTzaqOJFdc",
  authDomain: "sayfluent-a08d7.firebaseapp.com",
  projectId: "sayfluent-a08d7",
  storageBucket: "sayfluent-a08d7.firebasestorage.app",
  messagingSenderId: "1093206790184",
  appId: "1:1093206790184:web:ee8567a77944baa144651d",
  measurementId: "G-EXQ5GCVH8B",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
