import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { auth } from "./firebase";
import { toast } from "react-hot-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  const provider = new GoogleAuthProvider();
  // Add scopes for better profile access
  provider.addScope("email");
  provider.addScope("profile");

  try {
    // Use browserPopupRedirectResolver for better compatibility
    const result = await signInWithPopup(
      auth,
      provider,
      browserPopupRedirectResolver
    );
    const user = result.user;

    // Store user data in Firestore
    await saveUserToFirestore(user);

    toast.success("Successfully signed in with Google!");
    return user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);

    if (error.code === "auth/popup-closed-by-user") {
      toast.error("Sign-in was cancelled");
    } else if (error.code === "auth/popup-blocked") {
      toast.error(
        "Pop-up was blocked by your browser. Please allow pop-ups for this site."
      );
    } else if (error.code === "auth/unauthorized-domain") {
      toast.error(
        "This domain is not authorized for Google authentication. Please contact support."
      );
      console.error(
        "Unauthorized domain. Add this domain to Firebase Console -> Authentication -> Settings -> Authorized domains."
      );
    } else {
      toast.error(error.message || "Failed to sign in with Google");
    }

    return null;
  }
};

// Sign out
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
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

  const userRef = doc(db, "users", user.uid);

  try {
    // Check if user document already exists
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Create new user document if it doesn't exist
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL || "",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
    } else {
      // Update last login time
      await setDoc(
        userRef,
        {
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
  }
};
