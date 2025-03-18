import firebase from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  User,
  browserPopupRedirectResolver,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { toast } from "react-hot-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    if (user) {
      await saveUserToFirestore(user);
      toast.success("Successfully signed in with Google!");
    }
    return user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    handleAuthError(error);
    return null;
  }
};

// Sign out
export const logoutUser = async (): Promise<void> => {
  try {
    await auth.signOut();
    toast.success("Successfully signed out");
  } catch (error: any) {
    console.error("Error signing out", error);
    toast.error(error.message || "Failed to sign out");
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Save user data to Firestore
const saveUserToFirestore = async (user: User): Promise<void> => {
  if (!user.email) return;

  const userRef = db.collection('users').doc(user.uid);

  try {
    const doc = await userRef.get();

    if (!doc.exists) {
      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
  }
};

// Sign in with email and password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User | null> => {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    toast.success("Successfully signed in!");
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with email", error);
    handleAuthError(error);
    return null;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<User | null> => {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;

    if (user) {
      await user.updateProfile({ displayName });
      await saveUserToFirestore({
        ...user,
        displayName,
      });
    }

    toast.success("Account successfully created!");
    return user;
  } catch (error: any) {
    console.error("Error signing up with email", error);
    handleAuthError(error);
    return null;
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    await auth.sendPasswordResetEmail(email);
    toast.success("Password reset email sent! Check your inbox.");
    return true;
  } catch (error: any) {
    console.error("Error resetting password", error);
    handleAuthError(error);
    return false;
  }
};

// Helper function to handle auth errors
const handleAuthError = (error: any) => {
  switch (error.code) {
    case "auth/popup-closed-by-user":
      toast.error("Sign-in was cancelled");
      break;
    case "auth/popup-blocked":
      toast.error("Pop-up was blocked by your browser. Please allow pop-ups for this site.");
      break;
    case "auth/unauthorized-domain":
      toast.error("This domain is not authorized for Firebase authentication.");
      console.error("Unauthorized domain:", window.location.origin);
      break;
    case "auth/invalid-credential":
      toast.error("Invalid email or password. Please try again.");
      break;
    case "auth/too-many-requests":
      toast.error("Too many failed attempts. Please try again later or reset your password.");
      break;
    case "auth/email-already-in-use":
      toast.error("Email already in use. Try signing in instead.");
      break;
    case "auth/weak-password":
      toast.error("Password is too weak. Please use a stronger password.");
      break;
    case "auth/user-not-found":
      toast.error("No account found with this email address.");
      break;
    case "auth/invalid-email":
      toast.error("Invalid email address. Please check and try again.");
      break;
    default:
      toast.error(error.message || "An error occurred during authentication");
  }
};

// Sign in with Google using redirect (as fallback)
export const signInWithGoogleRedirect = async (): Promise<void> => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");

  try {
    await signInWithRedirect(auth, provider);
    // The user will be redirected to Google's authorization page
    // After authentication, they'll be redirected back to your app
    // Handle the redirect result in your AuthContext useEffect
  } catch (error: any) {
    console.error("Error setting up Google redirect sign in:", error);
    toast.error("Failed to set up Google authentication");
  }
};

// Function to handle redirect result - should be called on page load
export const handleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // User successfully authenticated
      const user = result.user;
      await saveUserToFirestore(user);
      toast.success("Successfully signed in with Google!");
      return user;
    }
    return null;
  } catch (error: any) {
    console.error("Error handling redirect result:", error);
    if (error.code === "auth/unauthorized-domain") {
      toast.error("This domain is not authorized for Firebase authentication.");
      console.error("Unauthorized domain:", window.location.origin);
    } else if (error.code) {
      toast.error(`Authentication error: ${error.code}`);
    } else {
      toast.error("Failed to complete authentication");
    }
    return null;
  }
};
