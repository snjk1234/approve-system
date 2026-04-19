import { Database } from '@/types_db';
import {
  Provider,
  SignInWithPasswordCredentials,
  SupabaseClient
} from '@supabase/supabase-js';
import { getURL } from '@/utils/helpers';

export const createApiClient = (supabase: SupabaseClient<Database>) => {
  const passwordSignup = async (creds: { email: string; password: string; options?: { data?: Record<string, any> } }) => {
    const res = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: {
        emailRedirectTo: getURL('/api/auth_callback'),
        data: creds.options?.data
      }
    });
    if (res.error) throw res.error;
    return res.data;
  };
  const passwordSignin = async (creds: SignInWithPasswordCredentials) => {
    const res = await supabase.auth.signInWithPassword(creds);
    if (res.error) throw res.error;
    return res.data;
  };
  const passwordReset = async (email: string) => {
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getURL('/api/reset_password')
    });
    console.log(res);
    if (res.error) throw res.error;
    return res.data;
  };
  const passwordUpdate = async (password: string) => {
    const res = await supabase.auth.updateUser({ password });
    if (res.error) throw res.error;
    return res.data;
  };
  const oauthSignin = async (provider: Provider) => {
    const res = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getURL('/api/auth_callback')
      }
    });
    if (res.error) throw res.error;
    return res.data;
  };
  const signOut = async () => {
    const res = await supabase.auth.signOut();
    if (res.error) throw res.error;
    return res;
  };
  const resendEmailVerification = async (email: string) => {
    const res = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getURL('/api/auth_callback')
      }
    });
    if (res.error) throw res.error;
    return res.data;
  };

  return {
    passwordSignin,
    passwordSignup,
    passwordReset,
    passwordUpdate,
    oauthSignin,
    signOut,
    resendEmailVerification
  };
};
