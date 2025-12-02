import { signIn, signOut, isAdmin } from '../services/authService.js';

export function initAuthView() {
  return {
    signIn: async (email, password) => {
      return await signIn(email, password);
    },
    signOut: async () => {
      return await signOut();
    },
    isAdmin,
  };
}
