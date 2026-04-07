import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GoogleIcon } from '@hugeicons/core-free-icons';
import { useCallback, useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { clerkFullNotesUrl } from '@/lib/clerk-hash-navigation';
import { isElectronShellSync } from '@/lib/use-is-electron';
import { cn } from '@/lib/utils';
import { clerkOAuthButtonClass } from '@/components/clerk-oauth-connection';
import { NOTA_CLERK_OAUTH_CALLBACK_URL } from '@/lib/nota-clerk-oauth-protocol';

type SsoCapable = {
  sso?: (params: {
    strategy: string;
    redirectUrl: string;
    redirectCallbackUrl: string;
  }) => Promise<{ error: { message?: string } | null } | void>;
};

export function ClerkDesktopOAuthButton({
  flow,
  label,
}: {
  flow: 'sign-in' | 'sign-up';
  label: string;
}): JSX.Element | null {
  const isElectron = isElectronShellSync();
  const { isLoaded: inLoaded, signIn } = useSignIn();
  const { isLoaded: upLoaded, signUp } = useSignUp();
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    setLastError(null);
    const resource = flow === 'sign-in' ? signIn : signUp;
    const sso = resource && (resource as unknown as SsoCapable).sso;
    if (typeof sso !== 'function') {
      setLastError('OAuth is not available yet. Try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      const result = await sso({
        strategy: 'oauth_google',
        redirectUrl: clerkFullNotesUrl(),
        redirectCallbackUrl: NOTA_CLERK_OAUTH_CALLBACK_URL,
      });
      const err = result && typeof result === 'object' && 'error' in result ? result.error : null;
      if (err) {
        setLastError(
          err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Sign-in failed. Please try again.',
        );
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [flow, signIn, signUp]);

  if (!isElectron) {
    return null;
  }

  const ready = flow === 'sign-in' ? inLoaded && signIn : upLoaded && signUp;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={!ready || busy}
        className={cn(clerkOAuthButtonClass)}
        onClick={() => void onClick()}
      >
        <HugeiconsIcon icon={GoogleIcon} className="size-4" />
        {busy ? 'Opening browser…' : label}
      </Button>
      {lastError ? (
        <p className="text-center text-sm text-destructive">{lastError}</p>
      ) : null}
    </div>
  );
}
