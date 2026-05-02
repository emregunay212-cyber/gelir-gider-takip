import { useEffect, useState, type ReactNode } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { getFirebaseAuth } from '../../lib/firebase';

type AuthStatus = 'pending' | 'ready' | 'error';

interface Props {
  children: ReactNode;
}

const FIREBASE_AUTH_PROVIDERS_URL =
  'https://console.firebase.google.com/project/aile-butce-emre-sila/authentication/providers';

export function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<AuthStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setStatus('ready');
      } else {
        signInAnonymously(auth).catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Anonim giriş başarısız.';
          setErrorMessage(message);
          setStatus('error');
        });
      }
    });

    return () => unsubscribe();
  }, []);

  if (status === 'pending') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-2 text-[var(--color-muted)]">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm">Bağlanıyor...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[var(--color-bg)] p-6 text-center">
        <p className="text-base font-semibold text-[var(--color-danger)]">
          Bağlantı Hatası
        </p>
        <p className="max-w-sm text-sm text-[var(--color-muted)]">
          {errorMessage}
        </p>
        <p className="max-w-sm text-xs text-[var(--color-muted)]">
          Firebase Console'da <strong>Anonymous</strong> sağlayıcısını
          etkinleştirmelisiniz.
        </p>
        <a
          href={FIREBASE_AUTH_PROVIDERS_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Firebase Console'u Aç
        </a>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs text-[var(--color-muted)] underline"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
