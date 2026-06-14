import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getJwtRole(token) {
  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded).role;
  } catch {
    return null;
  }
}

function getSupabaseConfigError() {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean);

  if (missing.length > 0) {
    return `Configure ${missing.join(' e ')} antes de usar o app.`;
  }

  if (supabaseAnonKey.startsWith('sb_secret_')) {
    return 'A chave configurada é secreta. Use uma chave pública anon ou publishable do Supabase.';
  }

  if (getJwtRole(supabaseAnonKey) === 'service_role') {
    return 'A chave configurada é service_role. Nunca use service_role no navegador; use a chave anon pública.';
  }

  return '';
}

export const supabaseConfigError = getSupabaseConfigError();
export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey);
