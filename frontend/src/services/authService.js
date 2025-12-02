import { supabase } from './supabaseClient.js';

let currentUser = null;
let currentRole = null;

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await loadUserRole(session.user.id);
  }
}

async function loadUserRole(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading user role:', error);
    currentRole = null;
  } else {
    currentRole = data?.role || null;
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentRole() {
  return currentRole;
}

export function isAdmin() {
  return currentRole === 'admin';
}

export function isStudent() {
  return currentRole === 'student';
}

export async function signUp(email, password, role = 'student') {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign up failed');

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      });

    if (roleError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    return { user: authData.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');

    currentUser = data.user;
    await loadUserRole(data.user.id);

    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    currentUser = null;
    currentRole = null;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        currentUser = session.user;
        await loadUserRole(session.user.id);
      } else {
        currentUser = null;
        currentRole = null;
      }
      callback(currentUser, currentRole, event);
    }
  );

  return subscription;
}
