import { PropsWithChildren } from 'react';
import { Sidebar } from '@/components/app/Sidebar';
import { Topbar } from '@/components/app/Topbar';

export default function AppLayout({ children }: PropsWithChildren) {
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
