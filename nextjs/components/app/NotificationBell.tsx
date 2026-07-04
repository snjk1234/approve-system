// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Clock, AlertTriangle, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function NotificationBell() {
    const router = useRouter();
    const supabase = createClient();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    // Fetch user and initial notifications
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                setNotifications(data);
            }
        };

        init();
    }, []);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('realtime_user_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setNotifications((prev) => [payload.new, ...prev]);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === payload.new.id ? payload.new : n))
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const handleNotificationClick = async (notif: any) => {
        if (!notif.is_read) {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notif.id);
            
            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
            );
        }

        if (notif.link) {
            router.push(notif.link);
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'approval_request':
                return <Clock size={16} className="text-amber-500" />;
            case 'approved':
            case 'completed':
                return <CheckCircle2 size={16} className="text-green-500" />;
            case 'rejected':
                return <AlertTriangle size={16} className="text-red-500" />;
            case 'message':
                return <MessageSquare size={16} className="text-blue-500" />;
            default:
                return <Bell size={16} className="text-muted-foreground" />;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all duration-200"
                    aria-label="الإشعارات"
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-85 p-2 text-right" dir="rtl">
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-bold text-sm text-foreground">الإشعارات</span>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:underline"
                        >
                            تحديد الكل كمقروء
                        </button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            لا توجد إشعارات حالياً
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-3 rounded-md cursor-pointer hover:bg-accent text-right transition-colors duration-150",
                                    !notif.is_read && "bg-primary/5 font-medium"
                                )}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {getIcon(notif.type)}
                                    <span className="font-bold text-xs text-foreground flex-1">
                                        {notif.title}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(notif.created_at).toLocaleTimeString('ar-EG', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                {notif.body && (
                                    <p className="text-[11px] text-muted-foreground mt-1 pr-6 leading-relaxed">
                                        {notif.body}
                                    </p>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
