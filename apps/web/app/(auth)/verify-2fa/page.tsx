'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';

const CODE_LENGTH = 6;

export default function Verify2FAPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newDigits = [...digits];

      // Handle paste of full code
      if (value.length > 1) {
        const pasted = value.slice(0, CODE_LENGTH).split('');
        for (let i = 0; i < CODE_LENGTH; i++) {
          newDigits[i] = pasted[i] || '';
        }
        setDigits(newDigits);
        const lastFilledIndex = Math.min(pasted.length - 1, CODE_LENGTH - 1);
        inputRefs.current[lastFilledIndex]?.focus();
        return;
      }

      newDigits[index] = value;
      setDigits(newDigits);

      // Auto-advance to next input
      if (value && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  async function handleVerify() {
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      setError('Bitte geben Sie den vollständigen 6-stelligen Code ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Integrate with Better Auth 2FA verification
      console.log('Verifying 2FA code:', code);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push('/dashboard');
    } catch {
      setError('Ungültiger Code. Bitte versuchen Sie es erneut.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBackupCodeVerify() {
    if (!backupCode.trim()) {
      setError('Bitte geben Sie einen Backup-Code ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Integrate with Better Auth backup code verification
      console.log('Verifying backup code:', backupCode);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push('/dashboard');
    } catch {
      setError('Ungültiger Backup-Code.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCountdown > 0) return;

    try {
      // TODO: Integrate with Better Auth resend 2FA code
      console.log('Resending 2FA code');
      setResendCountdown(60);
    } catch {
      setError('Code konnte nicht erneut gesendet werden.');
    }
  }

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (digits.every((d) => d !== '') && !isLoading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  if (showBackupInput) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Backup-Code
          </h2>
          <p className="text-sm text-muted-foreground">
            Geben Sie einen Ihrer Backup-Codes ein
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value)}
            placeholder="xxxx-xxxx-xxxx"
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-center text-sm tracking-widest shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={handleBackupCodeVerify}
            disabled={isLoading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Bestätigen
          </button>

          <button
            type="button"
            onClick={() => {
              setShowBackupInput(false);
              setError(null);
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Zurück zur Code-Eingabe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Zwei-Faktor-Authentifizierung
        </h2>
        <p className="text-sm text-muted-foreground">
          Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 6-digit code input */}
      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-input bg-transparent text-center text-lg font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Verify button */}
      <button
        type="button"
        onClick={handleVerify}
        disabled={isLoading || digits.some((d) => !d)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Bestätigen
      </button>

      {/* Resend + Backup code */}
      <div className="space-y-2 text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendCountdown > 0}
          className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {resendCountdown > 0
            ? `Code erneut senden (${resendCountdown}s)`
            : 'Code erneut senden'}
        </button>

        <div>
          <button
            type="button"
            onClick={() => {
              setShowBackupInput(true);
              setError(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Backup-Code verwenden
          </button>
        </div>
      </div>
    </div>
  );
}
