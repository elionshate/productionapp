'use client';

import { initializeApiBridge } from '../lib/api-bridge';

// Initialize the bridge synchronously at module load time (client-side only)
// This ensures window.electron is available before any component renders.
if (typeof window !== 'undefined') {
  initializeApiBridge();
}

/**
 * Provider component that ensures the API bridge is initialized.
 * The actual initialization happens at module load time above.
 */
export default function ApiBridgeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
