import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

export { app, auth, db, storage };
