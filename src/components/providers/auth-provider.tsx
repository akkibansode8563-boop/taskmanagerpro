'use client';

import type { ReactNode } from 'react';

/**
 * Open Workspace Provider: Authentication is disabled so all devices
 * have immediate, unrestricted access to the workspace without logins or timeouts.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
