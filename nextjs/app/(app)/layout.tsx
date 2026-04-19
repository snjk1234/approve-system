import { PropsWithChildren } from 'react';
import { Sidebar } from '@/components/app/Sidebar';
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
            {/* Sidebar */}
            <Sidebar />

            {/* Main content area - offset for sidebar */}
            <div className="mr-[260px]">
                <Topbar />
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
