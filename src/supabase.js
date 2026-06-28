import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const placeholderValues = new Set([
  'https://SEU-PROJETO.supabase.co',
  'SUA_CHAVE_ANON_PUBLICA',
]);

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

  const placeholders = [
    placeholderValues.has(supabaseUrl) && 'VITE_SUPABASE_URL',
    placeholderValues.has(supabaseAnonKey) && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean);

  if (placeholders.length > 0) {
    return `Substitua os valores de exemplo em ${placeholders.join(' e ')} pelas credenciais reais do Supabase.`;
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.supabase.co')) {
      return 'VITE_SUPABASE_URL deve ser uma URL HTTPS do projeto Supabase, como https://seu-projeto.supabase.co.';
    }
  } catch {
    return 'VITE_SUPABASE_URL deve ser uma URL valida do projeto Supabase.';
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
