import { PropsWithChildren } from 'react';
import { AppSidebarLayout } from '@/components/app/AppSidebarLayout';
import { Topbar } from '@/components/app/Topbar';
import { createClient } from '@/utils/supabase/server';

export default async function AdminLayout({ children }: PropsWithChildren) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
        isAdmin = profile?.is_admin || false;
    }

    // If logged in and is admin, show the standard app layout so they have the sidebar
    if (user && isAdmin) {
        return (
            <div className="min-h-screen bg-background">
                <AppSidebarLayout topbar={<Topbar />} isAdmin={true}>
                    {children}
                </AppSidebarLayout>
            </div>
        );
    }

    // Otherwise, render just the children (which will be the dedicated Admin Login form)
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}
