import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for constructing className strings conditionally.
 * Re-export from @vambiant/ui for convenience.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
