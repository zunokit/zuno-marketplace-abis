import { createAuthClient } from 'better-auth/client';
import { adminClient, apiKeyClient } from 'better-auth/client/plugins';
import { env } from '@/shared/config/env';

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,

  plugins: [adminClient(), apiKeyClient()]
});

// Export commonly used auth functions
export const { signIn, signOut, signUp, useSession } = authClient;

// Types - Infer from the authClient
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
