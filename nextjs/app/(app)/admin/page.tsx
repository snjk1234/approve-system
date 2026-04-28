'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    FileText,
    CheckCircle2,
    Clock,
    ShieldAlert,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    UserCog,
    Building2
} from 'lucide-react';

interface UserData {
    id: string;
    full_name: string | null;
    email: string | null;
    is_admin: boolean;
    created_at: string;
    roles?: { name: string } | null;
    departments?: { name: string } | null;
}

interface AdminData {
    stats: {
        totalUsers: number;
        totalDocs: number;
        pendingDocs: number;
        completedDocs: number;
    };
    users: UserData[];
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin');
            const json = await res.json();
            
            if (!res.ok) {
                if (res.status === 403) throw new Error('غير مصرح لك بالدخول لهذه الصفحة');
                throw new Error(json.error || 'فشل تحميل البيانات');
            }
            
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (error === 'غير مصرح لك بالدخول لهذه الصفحة') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <ShieldAlert size={32} />
                </div>
                <h2 className="text-xl font-bold text-foreground">وصول مرفوض</h2>
                <p className="text-sm text-muted-foreground">هذه الصفحة مخصصة لمدراء النظام فقط.</p>
                <button onClick={() => router.push('/dashboard')} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                    العودة للرئيسية
                </button>
            </div>
        );
    }

    const filteredUsers = data?.users.filter(u => 
        (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ShieldAlert className="text-primary" size={24} />
                        لوحة تحكم الإدارة
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">إدارة المستخدمين وإحصائيات النظام</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
                </button>
            </div>

            {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            ) : loading && !data ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : data && (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'إجمالي المستخدمين', value: data.stats.totalUsers, icon: Users, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
                            { label: 'إجمالي الاعتمادات', value: data.stats.totalDocs, icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
                            { label: 'اعتمادات نشطة', value: data.stats.pendingDocs, icon: Clock, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' },
                            { label: 'اعتمادات مكتملة', value: data.stats.completedDocs, icon: CheckCircle2, color: 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
                        ].map((stat, i) => (
                            <div key={i} className={`rounded-xl border bg-card p-5 flex items-center gap-4 ${stat.color}`}>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-sm`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                                    <p className="text-xs font-medium text-foreground/70 mt-0.5">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Users Management Section */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Users size={18} className="text-primary" />
                                    إدارة المستخدمين
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">قائمة بجميع الموظفين المسجلين في النظام</p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input 
                                    type="text" 
                                    placeholder="بحث عن مستخدم..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">الاسم</th>
                                        <th className="px-5 py-3 font-medium">البريد الإلكتروني</th>
                                        <th className="px-5 py-3 font-medium">القسم / الدور</th>
                                        <th className="px-5 py-3 font-medium">تاريخ التسجيل</th>
                                        <th className="px-5 py-3 font-medium text-center">الإدارة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                                لا يوجد مستخدمين مطابقين للبحث
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="font-medium text-foreground flex items-center gap-2">
                                                        {u.full_name || 'بدون اسم'}
                                                        {u.is_admin && <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">مدير</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1.5 text-xs text-foreground/80">
                                                            <Building2 size={12} className="text-muted-foreground" />
                                                            {u.departments?.name || 'غير محدد'}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-foreground/80">
                                                            <UserCog size={12} className="text-muted-foreground" />
                                                            {u.roles?.name || 'غير محدد'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                                                <td className="px-5 py-3 text-center">
                                                    {/* Placeholder for future actions */}
                                                    <button disabled className="text-xs text-muted-foreground hover:text-primary transition-colors opacity-50 cursor-not-allowed">
                                                        تعديل
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
