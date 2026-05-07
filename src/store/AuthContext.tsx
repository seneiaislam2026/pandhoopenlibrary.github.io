import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  email?: string;
  memberId?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  borrowBlocked?: boolean;
  status?: string;
  password?: string; // Only for manual users, stored in Firestore
  hasGiftSubscription?: boolean;
  giftSubscriptionExpiry?: string | null;
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  loginWithUsername: async () => {},
  logout: () => {},
  updateUser: () => {},
  loading: true
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Check for manual user in localStorage
    const savedManualUser = localStorage.getItem('pandho_manual_user');
    if (savedManualUser && !auth.currentUser) {
      try {
        const parsed = JSON.parse(savedManualUser);
        setUser(parsed);
        setToken('manual_session');
        
        // Listen to updates for manual user too
        unsubscribeProfile = onSnapshot(doc(db, 'users', parsed.id), (docSnap) => {
           if (docSnap.exists()) {
             setUser({ ...docSnap.data() as User, id: docSnap.id });
           }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${parsed.id}`);
        });
      } catch (e) {
        localStorage.removeItem('pandho_manual_user');
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we are choosing Firebase Auth, clear manual local storage to avoid conflict
        localStorage.removeItem('pandho_manual_user');
        
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);

        // Listen to profile changes in Firestore
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as User;
            const isSuperAdmin = 
              firebaseUser.email === 'seneiaislam@gmail.com' || 
              firebaseUser.email === 'admin@library.com' || 
              firebaseUser.email === 'seneiaislam@library.com' ||
              data.username === 'admin' ||
              data.username === 'seneiaislam';
              
            if (isSuperAdmin && data.role !== 'admin') {
              data.role = 'admin';
            }
            setUser({ ...data, email: firebaseUser.email || undefined, id: firebaseUser.uid });
          } else {
            // Fallback if no profile yet
            const isSuperAdmin = 
              firebaseUser.email === 'seneiaislam@gmail.com' || 
              firebaseUser.email === 'admin@library.com' || 
              firebaseUser.email === 'seneiaislam@library.com' ||
              firebaseUser.email?.startsWith('admin@') ||
              firebaseUser.email?.startsWith('seneiaislam@');
              
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              username: firebaseUser.email?.split('@')[0] || '',
              email: firebaseUser.email || undefined,
              role: isSuperAdmin ? 'admin' : 'reader'
            });
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });
      } else {
        if (!localStorage.getItem('pandho_manual_user')) {
          if (unsubscribeProfile) unsubscribeProfile();
          setUser(null);
          setToken(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

    const loginWithUsername = async (username: string, pass: string) => {
    const usernameLower = username.toLowerCase();
    
    // Try exact match first, then lowercase
    let q = query(collection(db, "users"), where("username", "==", username));
    let querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty && username !== usernameLower) {
      q = query(collection(db, "users"), where("username", "==", usernameLower));
      querySnapshot = await getDocs(q);
    }
    
    if (querySnapshot.empty) {
      throw new Error("User not found");
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;
    
    if (userData.password === pass) {
      const fullUser = { ...userData, id: userDoc.id };
      // Master override for system admins
      if (usernameLower === 'admin' || usernameLower === 'seneiaislam') {
        fullUser.role = 'admin';
      }
      setUser(fullUser);
      setToken('manual_session');
      localStorage.setItem('pandho_manual_user', JSON.stringify(fullUser));
    } else {
      throw new Error("Invalid password");
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('pandho_manual_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (newUser: User) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithUsername, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
