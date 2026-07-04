'use client';

import { Bell, Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

import { NotificationBell } from './NotificationBell';

export function Topbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
    const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; job_title: string; department: string } | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        const timeout = setTimeout(() => {
            setIsHovered(false);
        }, 500); // 500ms delay before closing
        setHoverTimeout(timeout);
    };

    useEffect(() => {
        setMounted(true);
        const supabase = createClient();
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            type ProfileResult = {
                full_name: string | null;
                email: string | null;
                role_id: { name: string | null } | null;
                department_id: { name: string | null } | null;
            };
            const { data: prof } = await supabase
                .from('profiles')
                .select(`
                    full_name,
                    email,
                    role_id ( name ),
                    department_id ( name )
                `)
                .eq('id', user.id)
                .maybeSingle<ProfileResult>();

            setProfile({
                full_name: prof?.full_name || 'مستخدم فلورينا',
                email: prof?.email || user.email || '',
                job_title: prof?.role_id?.name || 'موظف',
                department: prof?.department_id?.name || 'غير محدد'
            });
        }
        loadProfile();
    }, []);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
        };
    }, [hoverTimeout]);

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
                <NotificationBell />

                {/* User avatar with hover details */}
                <div 
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Link
                        href="/profile"
                        onClick={() => setIsHovered(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
                        aria-label="الملف الشخصي"
                    >
                        <User size={18} />
                    </Link>

                    {/* Hover Card */}
                    {isHovered && profile && (
                        <div className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-white/[0.08] bg-background/95 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-3 duration-300 text-right">
                            <div className="flex flex-col items-center gap-3 text-center pb-4 border-b border-border/50">
                                {/* Large Avatar with gradient background */}
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground font-extrabold text-xl shadow-md select-none">
                                    {profile.full_name ? profile.full_name[0].toUpperCase() : 'ف'}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-base font-extrabold text-foreground tracking-tight">{profile.full_name}</h4>
                                    <p className="text-xs text-muted-foreground/80 max-w-[240px] truncate">{profile.email}</p>
                                </div>
                            </div>
                            {/* User details (Job title and department) */}
                            <div className="py-3.5 space-y-2 border-b border-border/50 text-right text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-foreground">{profile.job_title}</span>
                                    <span className="text-muted-foreground">المسمى الوظيفي:</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-foreground">{profile.department}</span>
                                    <span className="text-muted-foreground">الإدارة:</span>
                                </div>
                            </div>
                            <div className="pt-3 flex justify-center">
                                <Link 
                                    href="/profile" 
                                    onClick={() => setIsHovered(false)}
                                    className="w-full text-center py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/95 transition-all duration-200 shadow-sm"
                                >
                                    عرض الملف الشخصي
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
