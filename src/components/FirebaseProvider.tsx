import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

interface CustomUser {
  uid: string;
  email: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signIn: (u: string, p: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOutUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    const savedUser = localStorage.getItem('localUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (u: string, p: string) => {
    if (u === 'PCE' && p === 'ahc123456') {
      const newUser = { uid: 'PCE_USER', email: 'pce@local' };
      setUser(newUser);
      localStorage.setItem('localUser', JSON.stringify(newUser));
    } else {
      throw new Error('Usuário ou senha inválidos.');
    }
  };

  const signOutUser = async () => {
    setUser(null);
    localStorage.removeItem('localUser');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

