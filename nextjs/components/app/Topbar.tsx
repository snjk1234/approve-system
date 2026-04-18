'use client';

import { Bell, Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function Topbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
            {/* Page title placeholder */}
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground">لوحة التحكم</h2>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Theme toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all duration-200"
                        aria-label="تبديل الوضع"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                )}

                {/* Notifications bell */}
                <button
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all duration-200"
                    aria-label="الإشعارات"
                >
                    <Bell size={18} />
                    {/* Unread indicator */}
                    <span className="absolute -top-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        3
                    </span>
                </button>

                {/* User avatar */}
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
                    aria-label="الملف الشخصي"
                >
                    <User size={18} />
                </button>
            </div>
        </header>
    );
}
