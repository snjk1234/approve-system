import { PropsWithChildren } from 'react';
import { AppSidebarLayout } from '@/components/app/AppSidebarLayout';
import { Topbar } from '@/components/app/Topbar';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function AppLayout({ children }: PropsWithChildren) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    return (
        <div className="min-h-screen bg-background">
            <AppSidebarLayout topbar={<Topbar />} isAdmin={profile?.is_admin || false}>
                {children}
            </AppSidebarLayout>
        </div>
    );
}
