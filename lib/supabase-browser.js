import {createClient} from '@supabase/supabase-js';

// The public marketing pages are prerendered on Vercel previews even when
// no Supabase environment variables have been provisioned for that preview.
// A deliberately non-routable placeholder avoids breaking the entire build.
// No real authentication can succeed until valid public credentials are set.
// Never put service-role credentials in NEXT_PUBLIC_* variables.
export const supabaseConfigured=Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
export const supabase=createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured-preview.invalid',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'public-key-not-configured',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
