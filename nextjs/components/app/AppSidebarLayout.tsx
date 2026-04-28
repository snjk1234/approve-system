'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';

export function AppSidebarLayout({ children, topbar, isAdmin }: { children: React.ReactNode, topbar: React.ReactNode, isAdmin?: boolean }) {
    const [isPinned, setIsPinned] = useState(true);
    
    // Load preference from local storage
    useEffect(() => {
        const stored = localStorage.getItem('sidebar-pinned');
        if (stored !== null) {
            setIsPinned(stored === 'true');
        }
    }, []);

    const handlePinChange = (pinned: boolean) => {
        setIsPinned(pinned);
        localStorage.setItem('sidebar-pinned', String(pinned));
    };

    return (
        <>
            <Sidebar isPinned={isPinned} setIsPinned={handlePinChange} isAdmin={isAdmin} />
            <div className={`transition-all duration-300 ${isPinned ? 'mr-[260px]' : 'mr-[80px]'}`}>
                {topbar}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </>
    );
}
