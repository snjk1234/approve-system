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

    return (
        <div className="min-h-screen bg-background">
            <AppSidebarLayout topbar={<Topbar />}>
                {children}
            </AppSidebarLayout>
        </div>
    );
}
