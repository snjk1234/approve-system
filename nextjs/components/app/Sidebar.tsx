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

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed top-0 right-0 z-40 flex h-screen w-[260px] flex-col bg-sidebar text-sidebar-foreground border-l border-white/10">
            {/* Logo / Brand */}
            <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                    ف
                </div>
                <div>
                    <h1 className="text-base font-bold leading-tight">فلورينا</h1>
                    <p className="text-[11px] text-sidebar-foreground/60">نظام الاعتمادات</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                                }
              `}
                        >
                            <div
                                className={`
                  flex h-8 w-8 items-center justify-center rounded-lg
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-white/20'
                                        : 'bg-white/5 group-hover:bg-white/10'
                                    }
                `}
                            >
                                <Icon size={18} />
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom nav */}
            <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3">
                {bottomItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                                }
              `}
                        >
                            <div
                                className={`
                  flex h-8 w-8 items-center justify-center rounded-lg
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-white/20'
                                        : 'bg-white/5 group-hover:bg-white/10'
                                    }
                `}
                            >
                                <Icon size={18} />
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
