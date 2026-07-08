import { useAppStore, type AuthUser } from "@/lib/store";

/**
 * Supabase Auth (per All4Pets T&C §2: Google Sign-In, Apple Sign-In, or email).
 * Google/Apple require enabling the providers in the Supabase dashboard;
 * email magic links work out of the box.
 */

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function toAuthUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    name:
      (u.user_metadata?.full_name as string) ??
      (u.user_metadata?.name as string) ??
      (u.user_metadata?.username as string) ??
      null,
  };
}

/** Restore session + subscribe to auth changes. Call once from AppShell. */
export async function initAuth(): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  useAppStore.getState().setAuthUser(toAuthUser(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((_event, session) => {
    useAppStore.getState().setAuthUser(toAuthUser(session?.user ?? null));
  });
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "Supabase is not configured" };
  const { getSupabase } = await import("@/lib/supabase");
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "Supabase is not configured" };
  const { getSupabase } = await import("@/lib/supabase");
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { getSupabase } = await import("@/lib/supabase");
  await getSupabase().auth.signOut();
  useAppStore.getState().setAuthUser(null);
}

/**
 * Account deletion (T&C §7 / Privacy §7): purges identity via the
 * delete_account RPC; anonymized cards persist de-linked for game integrity.
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "Supabase is not configured" };
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const { error } = await supabase.rpc("delete_account");
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  useAppStore.getState().setAuthUser(null);
  return {};
}
