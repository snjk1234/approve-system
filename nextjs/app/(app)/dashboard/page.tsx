import Link from 'next/link';
import {
    ClipboardCheck,
    XCircle,
    CheckCircle2,
    Archive,
    FileText,
    Clock
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { getDashboardStats, getRecentDocuments } from '@/utils/supabase/queries';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
    const supabase = await createClient();
    const statsData = await getDashboardStats(supabase);
    const recentDocs = await getRecentDocuments(supabase);

    const stats = [
        {
            label: 'بانتظار الاعتماد',
            value: statsData?.pending || 0,
            icon: ClipboardCheck,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            href: '/approvals'
        },
        {
            label: 'مرفوضة / تحت النقاش',
            value: statsData?.rejected || 0,
            icon: XCircle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            href: '/approvals'
        },
        {
            label: 'مكتملة',
            value: statsData?.completed || 0,
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            href: '/approvals'
        },
        {
            label: 'الأرشيف',
            value: statsData?.archived || 0,
            icon: Archive,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            href: '/archive'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page heading */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    مرحباً بك في نظام المحادثات والاعتمادات المؤسسية
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer block"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                        {stat.label}
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                        {stat.value}
                                    </p>
                                </div>
                                <div
                                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.bgColor} ${stat.color} transition-transform duration-300 group-hover:scale-110`}
                                >
                                    <Icon size={22} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <a
                    href="/approvals/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all duration-200 hover:shadow-lg"
                >
                    <ClipboardCheck size={18} />
                    طلب اعتماد جديد
                </a>
                <a
                    href="/chat"
                    className="inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-accent transition-all duration-200"
                >
                    محادثة جديدة
                </a>
            </div>

            {/* Recent Requests Table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">
                        آخر الطلبات
                    </h3>
                    <a href="/approvals" className="text-xs text-primary hover:underline">عرض الكل</a>
                </div>
                
                {recentDocs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground">
                                    <th className="px-5 py-3 font-semibold">رقم الطلب</th>
                                    <th className="px-5 py-3 font-semibold">العنوان</th>
                                    <th className="px-5 py-3 font-semibold">الحالة</th>
                                    <th className="px-5 py-3 font-semibold">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {recentDocs.map((doc: any) => (
                                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-4 font-mono text-xs">#{doc.request_number}</td>
                                        <td className="px-5 py-4 font-medium">{doc.title}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${doc.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                  doc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                                                  'bg-slate-500/10 text-slate-500'}`}>
                                                {doc.status === 'completed' ? 'مكتمل' : doc.status === 'pending' ? 'قيد الانتظار' : doc.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground">
                        <FileText size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm">لا توجد طلبات حالياً</p>
                        <p className="text-xs mt-1">ابدأ بإنشاء طلب اعتماد جديد من القائمة أعلاه</p>
                    </div>
                )}
            </div>
        </div>
    );
}
