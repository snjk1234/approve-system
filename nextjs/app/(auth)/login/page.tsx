import { AuthForm } from '@/components/misc/AuthForm';
import { AuthState } from '@/utils/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/dashboard');
    }

    return <AuthForm state={AuthState.Signin} />;
}
