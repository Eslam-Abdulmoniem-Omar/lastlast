import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  setDoc,
  orderBy,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  disableNetwork,
  enableNetwork,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// Network control for Firestore
export const toggleFirestoreNetwork = async (enable: boolean) => {
  try {
    if (enable) {
      await enableNetwork(db);
      console.log("Firestore network connection enabled");
    } else {
      await disableNetwork(db);
      console.log("Firestore network connection disabled");
    }
    return true;
  } catch (error) {
    console.error("Error toggling Firestore network:", error);
    return false;
  }
};

// Firestore functions
export const addDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

export const setDocument = async (
  collectionName: string,
  id: string,
  data: any
) => {
  try {
    await setDoc(
      doc(db, collectionName, id),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { id, ...data };
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
};

export const getDocuments = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

export const getDocumentById = async (collectionName: string, id: string) => {
  try {
    const docSnap = await getDoc(doc(db, collectionName, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

export const queryDocuments = async (
  collectionName: string,
  fieldPath: string,
  operator: any,
  value: any
) => {
  try {
    const q = query(
      collection(db, collectionName),
      where(fieldPath, operator, value)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error querying documents in ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async (
  collectionName: string,
  id: string,
  data: any
) => {
  try {
    await updateDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { id, ...data };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return true;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const deleteFile = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};
