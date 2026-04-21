'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    MessageSquare,
    ClipboardCheck,
    Archive,
    Search,
    Settings,
    FileText
} from 'lucide-react';

const navItems = [
    {
        href: '/dashboard',
        label: 'لوحة التحكم',
        icon: LayoutDashboard
    },
    {
        href: '/chat',
        label: 'المحادثات',
        icon: MessageSquare
    },
    {
        href: '/approvals',
        label: 'الاعتمادات',
        icon: ClipboardCheck
    },
    {
        href: '/approvals/new',
        label: 'طلب جديد',
        icon: FileText
    },
    {
        href: '/archive',
        label: 'الأرشيف',
        icon: Archive
    },
    {
        href: '/search',
        label: 'البحث',
        icon: Search
    }
];

const bottomItems = [
    {
        href: '/profile',
        label: 'الإعدادات',
        icon: Settings
    }
];

import { useState } from 'react';

export function Sidebar({ isPinned, setIsPinned }: { isPinned?: boolean, setIsPinned?: (v: boolean) => void }) {
    const pathname = usePathname();
    const [isHovered, setIsHovered] = useState(false);

    // If no props are passed (e.g. usage outside layout wrapper), assume it's always pinned
    const _isPinned = isPinned ?? true;
    const expanded = _isPinned || isHovered;

    return (
        <aside 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed top-0 right-0 z-50 flex h-screen flex-col bg-sidebar text-sidebar-foreground border-l border-white/10 transition-all duration-300 ${expanded ? 'w-[260px]' : 'w-[80px]'}`}
        >
            {/* Logo / Brand */}
            <div className={`flex h-16 items-center px-5 border-b border-white/10 ${expanded ? 'justify-between' : 'justify-center'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                        ف
                    </div>
                    {expanded && (
                        <div className="whitespace-nowrap transition-opacity duration-300">
                            <h1 className="text-base font-bold leading-tight">فلورينا</h1>
                            <p className="text-[11px] text-sidebar-foreground/60">نظام الاعتمادات</p>
                        </div>
                    )}
                </div>
                {expanded && setIsPinned && (
                    <button 
                        onClick={() => setIsPinned(!_isPinned)}
                        className={`shrink-0 p-1 rounded-md transition-colors ${
                            _isPinned 
                                ? 'bg-primary/20 text-primary' 
                                : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/5'
                        }`}
                        title={_isPinned ? "إلغاء التثبيت" : "تثبيت القائمة"}
                    >
                        {/* A simple pin icon using SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={_isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
                        </svg>
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                                }
                ${expanded ? 'gap-3 justify-start' : 'justify-center'}
              `}
                        >
                            <div
                                className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-white/20'
                                        : 'bg-white/5 group-hover:bg-white/10'
                                    }
                `}
                            >
                                <Icon size={18} />
                            </div>
                            {expanded && (
                                <span className="whitespace-nowrap transition-opacity duration-300">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom nav */}
            <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3 overflow-hidden">
                {bottomItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                                }
                ${expanded ? 'gap-3 justify-start' : 'justify-center'}
              `}
                        >
                            <div
                                className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-white/20'
                                        : 'bg-white/5 group-hover:bg-white/10'
                                    }
                `}
                            >
                                <Icon size={18} />
                            </div>
                            {expanded && (
                                <span className="whitespace-nowrap transition-opacity duration-300">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
