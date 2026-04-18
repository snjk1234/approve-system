import {
    ClipboardCheck,
    XCircle,
    CheckCircle2,
    Archive
} from 'lucide-react';

const stats = [
    {
        label: 'بانتظار الاعتماد',
        value: 0,
        icon: ClipboardCheck,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10'
    },
    {
        label: 'مرفوضة / تحت النقاش',
        value: 0,
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10'
    },
    {
        label: 'مكتملة',
        value: 0,
        icon: CheckCircle2,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10'
    },
    {
        label: 'الأرشيف',
        value: 0,
        icon: Archive,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10'
    }
];

export default function DashboardPage() {
    return (
        <div className="space-y-8">
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
                        <div
                            key={stat.label}
                            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                        >
                            {/* Decorative gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
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
                        </div>
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

            {/* Recent Requests Table - placeholder */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                    <h3 className="text-base font-bold text-foreground">
                        آخر الطلبات
                    </h3>
                </div>
                <div className="p-8 text-center text-muted-foreground">
                    <Archive size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">لا توجد طلبات حالياً</p>
                    <p className="text-xs mt-1">ابدأ بإنشاء طلب اعتماد جديد</p>
                </div>
            </div>
        </div>
    );
}
