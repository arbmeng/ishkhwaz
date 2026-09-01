import { createClient } from '@supabase/supabase-js';

// Publishable key only — this is the one Supabase key that's meant to be
// public. The secret key lives only in the PHP API's own server-side config
// and is never shipped to the browser.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://flwoxovadwonqziwnnpa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_qGlb9b3tk-pDE0Z04hrORw_dklj-uXn';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Kicks off the OAuth redirect to the given provider. Supabase handles the
// actual handshake; the app picks the resulting session back up in
// AuthContext's onAuthStateChange listener once the browser returns here.
export const signInWithProvider = (provider) =>
  supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
