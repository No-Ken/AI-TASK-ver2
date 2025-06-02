import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import liff from '@line/liff';

interface LiffContextType {
  liff: typeof liff | null;
  isLoading: boolean;
  error: string | null;
  profile: any | null;
  idToken: string | null;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  isLoading: true,
  error: null,
  profile: null,
  idToken: null,
});

interface LiffProviderProps {
  children: ReactNode;
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error('LIFF ID is not configured');
        }

        await liff.init({
          liffId,
          withLoginOnExternalBrowser: true,
        });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // Get user profile
        const userProfile = await liff.getProfile();
        setProfile(userProfile);

        // Get ID token
        const token = liff.getIDToken();
        setIdToken(token);

      } catch (err) {
        console.error('LIFF initialization failed:', err);
        setError(err instanceof Error ? err.message : 'LIFF initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLiff();
  }, []);

  return (
    <LiffContext.Provider 
      value={{ 
        liff: isLoading ? null : liff, 
        isLoading, 
        error, 
        profile, 
        idToken 
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  const context = useContext(LiffContext);
  if (!context) {
    throw new Error('useLiff must be used within a LiffProvider');
  }
  return context;
}