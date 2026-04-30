'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

interface DocumentData {
    id: string;
    request_number: number;
    title: string;
    status: string;
    created_at: string;
    profiles?: { full_name: string | null } | null;
}

interface AdminData {
    stats: {
        totalUsers: number;
        totalDocs: number;
        pendingDocs: number;
        completedDocs: number;
    };
    users: UserData[];
    documents: DocumentData[];
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
    const [activeTab, setActiveTab] = useState<'users' | 'allDocs' | 'pendingDocs' | 'completedDocs'>('users');
    
    // Admin login states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin');
            const json = await res.json();
            
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) throw new Error('UNAUTHORIZED');
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

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        
        try {
            // Need to import createClient from @/utils/supabase/client for client-side auth
            // We'll require it dynamically here to keep imports clean
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();
            
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) throw new Error('بيانات الدخول غير صحيحة');
            
            // Reload to re-evaluate layout.tsx and page.tsx with the new session
            window.location.reload();
            
        } catch (err: any) {
            setLoginError(err.message);
            setLoginLoading(false);
        }
    };

    if (error === 'UNAUTHORIZED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
                <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border shadow-lg">
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                            <ShieldAlert size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">بوابة الإدارة</h2>
                        <p className="text-sm text-muted-foreground mt-1 text-center">يرجى تسجيل الدخول بحساب المدير للوصول إلى لوحة التحكم</p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        {loginError && (
                            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                                {loginError}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="admin@example.com"
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">كلمة المرور</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="••••••••"
                                dir="ltr"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loginLoading}
                            className="w-full mt-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all flex justify-center items-center gap-2"
                        >
                            {loginLoading ? <Loader2 size={18} className="animate-spin" /> : 'تسجيل الدخول'}
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                            لست مديراً؟ العودة لتسجيل دخول الموظفين
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const filteredUsers = data?.users.filter(u => 
        (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    const getFilteredDocs = () => {
        if (!data) return [];
        let docs = data.documents;
        if (activeTab === 'pendingDocs') docs = docs.filter(d => d.status === 'in_progress');
        if (activeTab === 'completedDocs') docs = docs.filter(d => d.status === 'completed');
        
        return docs.filter(d => 
            (d.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (d.request_number.toString().includes(searchQuery))
        );
    };

    const filteredDocs = getFilteredDocs();

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
                            { label: 'إجمالي المستخدمين', value: data.stats.totalUsers, icon: Users, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800', tab: 'users' as const },
                            { label: 'إجمالي الاعتمادات', value: data.stats.totalDocs, icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800', tab: 'allDocs' as const },
                            { label: 'اعتمادات نشطة', value: data.stats.pendingDocs, icon: Clock, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800', tab: 'pendingDocs' as const },
                            { label: 'اعتمادات مكتملة', value: data.stats.completedDocs, icon: CheckCircle2, color: 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800', tab: 'completedDocs' as const },
                        ].map((stat, i) => (
                            <button 
                                key={i} 
                                onClick={() => setActiveTab(stat.tab)}
                                className={`text-right rounded-xl border bg-card p-5 flex items-center gap-4 ${stat.color} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 block ${activeTab === stat.tab ? 'ring-2 ring-primary/50 shadow-md -translate-y-0.5' : ''}`}
                            >
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-sm`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                                    <p className="text-xs font-medium text-foreground/70 mt-0.5">{stat.label}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Table Section */}
                    <div id="data-table" className="rounded-xl border border-border bg-card overflow-hidden flex flex-col scroll-mt-20">
                        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    {activeTab === 'users' ? <Users size={18} className="text-primary" /> : <FileText size={18} className="text-primary" />}
                                    {activeTab === 'users' ? 'إدارة المستخدمين' : activeTab === 'allDocs' ? 'جميع الاعتمادات' : activeTab === 'pendingDocs' ? 'الاعتمادات النشطة' : 'الاعتمادات المكتملة'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {activeTab === 'users' ? 'قائمة بجميع الموظفين المسجلين في النظام' : 'قائمة بطلبات الاعتماد في النظام لتسهيل المراقبة والمتابعة'}
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input 
                                    type="text" 
                                    placeholder={activeTab === 'users' ? "بحث عن مستخدم..." : "بحث عن طلب..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                                    {activeTab === 'users' ? (
                                        <tr>
                                            <th className="px-5 py-3 font-medium">الاسم</th>
                                            <th className="px-5 py-3 font-medium">البريد الإلكتروني</th>
                                            <th className="px-5 py-3 font-medium">القسم / الدور</th>
                                            <th className="px-5 py-3 font-medium">تاريخ التسجيل</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th className="px-5 py-3 font-medium">رقم الطلب</th>
                                            <th className="px-5 py-3 font-medium">العنوان</th>
                                            <th className="px-5 py-3 font-medium">المنشئ</th>
                                            <th className="px-5 py-3 font-medium">الحالة</th>
                                            <th className="px-5 py-3 font-medium">التاريخ</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {activeTab === 'users' ? (
                                        filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
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
                                                </tr>
                                            ))
                                        )
                                    ) : (
                                        filteredDocs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                                    لا توجد طلبات اعتماد مطابقة
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDocs.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-5 py-3 font-mono text-xs">#{doc.request_number}</td>
                                                    <td className="px-5 py-3 font-medium text-foreground">
                                                        <Link href={`/approvals/${doc.id}`} className="hover:underline hover:text-primary">
                                                            {doc.title}
                                                        </Link>
                                                    </td>
                                                    <td className="px-5 py-3 text-muted-foreground">{doc.profiles?.full_name || 'مجهول'}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium 
                                                            ${doc.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                              doc.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' : 
                                                              doc.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 
                                                              'bg-slate-500/10 text-slate-500'}`}>
                                                            {doc.status === 'completed' ? 'مكتمل' : 
                                                             doc.status === 'in_progress' ? 'قيد المراجعة' : 
                                                             doc.status === 'cancelled' ? 'ملغي' : 
                                                             doc.status === 'pending' ? 'بانتظار الاعتماد' : doc.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(doc.created_at)}</td>
                                                </tr>
                                            ))
                                        )
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
