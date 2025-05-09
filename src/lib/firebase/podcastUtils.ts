import { db, storage } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Podcast,
  UserProgress,
  WritingSubmission,
  SpeakingSubmission,
} from "../types";

// Podcast management functions
export async function getPodcasts(level?: string, limitCount = 10) {
  try {
    let q;

    if (level) {
      q = query(
        collection(db, "podcasts"),
        where("level", "==", level),
        orderBy("publishedDate", "desc"),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, "podcasts"),
        orderBy("publishedDate", "desc"),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Podcast[];
  } catch (error) {
    console.error("Error getting podcasts:", error);
    throw error;
  }
}

export async function getPodcastById(podcastId: string) {
  try {
    const docRef = doc(db, "podcasts", podcastId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Podcast;
    } else {
      throw new Error("Podcast not found");
    }
  } catch (error) {
    console.error("Error getting podcast:", error);
    throw error;
  }
}

// Function to create a podcast with video URL (YouTube or TikTok)
export async function createPodcastWithVideo(
  podcastData: Partial<Podcast>,
  userId?: string
) {
  try {
    // Add current timestamp if missing
    const dataToSave = {
      ...podcastData,
      publishedDate: podcastData.publishedDate || new Date().toISOString(),
      createdBy: userId || "anonymous",
      createdAt: serverTimestamp(),
    };

    // If it's a TikTok video, ensure the correct videoSource field
    if (podcastData.tiktokUrl && !podcastData.videoSource) {
      dataToSave.videoSource = "tiktok";
    } else if (podcastData.youtubeUrl && !podcastData.videoSource) {
      dataToSave.videoSource = "youtube";
    }

    // Add the podcast to Firestore
    const docRef = await addDoc(collection(db, "podcasts"), dataToSave);

    console.log(`Created new podcast with ID: ${docRef.id}`);

    return {
      id: docRef.id,
      ...dataToSave,
    } as Podcast;
  } catch (error) {
    console.error("Error creating podcast:", error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function createPodcastWithYouTube(
  podcastData: Partial<Podcast>,
  userId?: string
) {
  return createPodcastWithVideo(podcastData, userId);
}

// User progress functions
export async function getUserProgress(userId: string, podcastId: string) {
  try {
    const q = query(
      collection(db, "userProgress"),
      where("userId", "==", userId),
      where("podcastId", "==", podcastId)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data(),
    } as UserProgress & { id: string };
  } catch (error) {
    console.error("Error getting user progress:", error);
    throw error;
  }
}

export async function updateListeningProgress(
  userId: string,
  podcastId: string
) {
  try {
    const progress = await getUserProgress(userId, podcastId);

    if (progress) {
      await updateDoc(doc(db, "userProgress", progress.id), {
        listenedAt: serverTimestamp(),
      });
      return progress.id;
    } else {
      const docRef = await addDoc(collection(db, "userProgress"), {
        userId,
        podcastId,
        listenedAt: serverTimestamp(),
      });
      return docRef.id;
    }
  } catch (error) {
    console.error("Error updating listening progress:", error);
    throw error;
  }
}

export async function submitWritingAnswer(
  userId: string,
  podcastId: string,
  text: string
) {
  try {
    const writingSubmission: WritingSubmission = {
      text,
      submittedAt: new Date().toISOString(),
    };

    const progress = await getUserProgress(userId, podcastId);

    if (progress) {
      await updateDoc(doc(db, "userProgress", progress.id), {
        writingSubmission,
      });
      return progress.id;
    } else {
      const docRef = await addDoc(collection(db, "userProgress"), {
        userId,
        podcastId,
        writingSubmission,
      });
      return docRef.id;
    }
  } catch (error) {
    console.error("Error submitting writing answer:", error);
    throw error;
  }
}

export async function uploadAudio(
  userId: string,
  podcastId: string,
  questionId: string,
  audioBlob: Blob
) {
  try {
    const audioRef = ref(
      storage,
      `speaking/${userId}/${podcastId}/${questionId}.webm`
    );
    await uploadBytes(audioRef, audioBlob);
    const audioUrl = await getDownloadURL(audioRef);
    return audioUrl;
  } catch (error) {
    console.error("Error uploading audio:", error);
    throw error;
  }
}

export async function submitSpeakingAnswer(
  userId: string,
  podcastId: string,
  questionId: string,
  transcribedText: string,
  audioUrl?: string
) {
  try {
    const speakingSubmission: SpeakingSubmission = {
      questionId,
      transcribedText,
      audioUrl,
      submittedAt: new Date().toISOString(),
    };

    const progress = await getUserProgress(userId, podcastId);

    if (progress) {
      const speakingSubmissions = progress.speakingSubmissions || [];
      const updatedSubmissions = [
        ...speakingSubmissions.filter((sub) => sub.questionId !== questionId),
        speakingSubmission,
      ];

      await updateDoc(doc(db, "userProgress", progress.id), {
        speakingSubmissions: updatedSubmissions,
      });
      return progress.id;
    } else {
      const docRef = await addDoc(collection(db, "userProgress"), {
        userId,
        podcastId,
        speakingSubmissions: [speakingSubmission],
      });
      return docRef.id;
    }
  } catch (error) {
    console.error("Error submitting speaking answer:", error);
    throw error;
  }
}

// Function to save a video to user's collection
export async function saveVideoToCollection(
  userId: string,
  videoData: Partial<Podcast>
) {
  try {
    // Add current timestamp and user reference
    const dataToSave = {
      ...videoData,
      publishedDate: videoData.publishedDate || new Date().toISOString(),
      createdBy: userId,
      createdAt: serverTimestamp(),
      isShort: true, // Mark as short video
      saved: true, // Mark as saved to collection
    };

    // Determine video source
    if (videoData.tiktokUrl && !videoData.videoSource) {
      dataToSave.videoSource = "tiktok";
    } else if (videoData.youtubeUrl && !videoData.videoSource) {
      dataToSave.videoSource = "youtube";
    }

    // Add to user's saved videos collection
    const docRef = await addDoc(collection(db, "savedVideos"), dataToSave);

    console.log(`Saved video to collection with ID: ${docRef.id}`);

    return {
      id: docRef.id,
      ...dataToSave,
    } as Podcast;
  } catch (error) {
    console.error("Error saving video to collection:", error);
    throw error;
  }
}

// Function to get user's saved videos
export async function getUserSavedVideos(userId: string, limitCount = 50) {
  try {
    const q = query(
      collection(db, "savedVideos"),
      where("createdBy", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Podcast[];
  } catch (error) {
    console.error("Error getting saved videos:", error);
    throw error;
  }
}
