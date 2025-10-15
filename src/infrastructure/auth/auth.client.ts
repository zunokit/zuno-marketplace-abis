import { createAuthClient } from 'better-auth/client';
import { adminClient, apiKeyClient } from 'better-auth/client/plugins';
import { env } from '@/shared/config/env';

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  // Configure client to automatically attach Bearer token if available
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => (typeof window !== 'undefined' ? localStorage.getItem('bearer_token') || '' : ''),
    },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get('set-auth-token');
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('bearer_token', token);
      }
    },
  },
  plugins: [adminClient(), apiKeyClient()]
});

// Export commonly used auth functions
export const { signIn, signOut, signUp, useSession } = authClient;

// Types - Infer from the authClient
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
