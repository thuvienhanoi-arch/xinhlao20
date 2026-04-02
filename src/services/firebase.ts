import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, Timestamp, deleteDoc, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export interface SavedPodcast {
  id?: string;
  title: string;
  script: string;
  ttsReadyScript?: string;
  audioUrl: string;
  imageUrl: string;
  createdAt: Timestamp;
  userId: string;
}

export const savePodcast = async (podcast: Omit<SavedPodcast, 'id' | 'createdAt' | 'userId'>) => {
  if (!auth.currentUser) throw new Error('User not authenticated');
  
  const path = 'podcasts';
  const podcastData: Omit<SavedPodcast, 'id'> = {
    ...podcast,
    userId: auth.currentUser.uid,
    createdAt: Timestamp.now()
  };
  
  try {
    return await addDoc(collection(db, path), podcastData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getSavedPodcasts = async () => {
  if (!auth.currentUser) return [];
  
  const path = 'podcasts';
  const q = query(
    collection(db, path),
    where('userId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedPodcast[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const deleteSavedPodcast = async (id: string) => {
  const path = `podcasts/${id}`;
  try {
    return await deleteDoc(doc(db, 'podcasts', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export interface Consultation {
  id?: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
  status: 'pending' | 'contacted' | 'scheduled' | 'completed';
  createdAt: Timestamp;
}

export const requestConsultation = async (data: Omit<Consultation, 'id' | 'uid' | 'status' | 'createdAt'>) => {
  if (!auth.currentUser) throw new Error('User not authenticated');
  
  const path = 'consultations';
  const consultationData: Omit<Consultation, 'id'> = {
    ...data,
    uid: auth.currentUser.uid,
    status: 'pending',
    createdAt: Timestamp.now()
  };
  
  try {
    return await addDoc(collection(db, path), consultationData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getMyConsultations = async () => {
  if (!auth.currentUser) return [];
  
  const path = 'consultations';
  const q = query(
    collection(db, path),
    where('uid', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Consultation[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export interface BookAnalysis {
  id?: string;
  userId: string;
  bookTitle: string;
  author: string;
  analysis: string;
  createdAt: Timestamp;
}

export const saveBookAnalysis = async (data: Omit<BookAnalysis, 'id' | 'userId' | 'createdAt'>) => {
  if (!auth.currentUser) throw new Error('User not authenticated');
  
  const path = 'bookAnalyses';
  const analysisData: Omit<BookAnalysis, 'id'> = {
    ...data,
    userId: auth.currentUser.uid,
    createdAt: Timestamp.now()
  };
  
  try {
    return await addDoc(collection(db, path), analysisData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getBookAnalyses = async () => {
  if (!auth.currentUser) return [];
  
  const path = 'bookAnalyses';
  const q = query(
    collection(db, path),
    where('userId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BookAnalysis[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};
