'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    ClipboardCheck,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronLeft,
    FileText,
    Users,
    RefreshCw,
    Inbox,
    Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'waiting' | 'pending' | 'approved' | 'rejected';
type DocStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

interface ApprovalStep {
    id: string;
    sequence: number;
    status: StepStatus;
    approver_id: string;
    comment: string | null;
    acted_at: string | null;
}

interface Document {
    id: string;
    request_number: number;
    title: string;
    description: string | null;
    status: DocStatus;
    file_url: string | null;
    file_name: string | null;
    created_at: string;
    updated_at: string;
    creator_id?: string;
    approval_steps: ApprovalStep[];
}

interface Profile {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DocStatus, { label: string; icon: typeof Clock; className: string }> = {
    pending: { label: 'معلق', icon: Clock, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    in_progress: { label: 'قيد المراجعة', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    paused: { label: 'موقوف', icon: AlertCircle, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    completed: { label: 'مكتمل', icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    cancelled: { label: 'مرفوض', icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function getInitials(name: string | null | undefined) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocStatus }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
            <Icon size={12} />
            {cfg.label}
        </span>
    );
}

function StepProgress({ steps, profiles }: { steps: ApprovalStep[]; profiles: Record<string, Profile> }) {
    if (!steps.length) return null;
    const sorted = [...steps].sort((a, b) => a.sequence - b.sequence);
    return (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
            {sorted.map((step, idx) => {
                const profile = profiles[step.approver_id];
                const initials = getInitials(profile?.full_name);
                const colorClass =
                    step.status === 'approved' ? 'bg-green-500 text-white' :
                    step.status === 'rejected' ? 'bg-red-500 text-white' :
                    step.status === 'pending' ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                    'bg-muted text-muted-foreground';
                return (
                    <div key={step.id} className="flex items-center gap-1">
                        <div
                            title={profile?.full_name || 'غير معروف'}
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${colorClass}`}
                        >
                            {initials}
                        </div>
                        {idx < sorted.length - 1 && (
                            <div className={`h-px w-4 ${step.status === 'approved' ? 'bg-green-400' : 'bg-border'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function DocumentCard({
    doc,
    profiles,
    myStepStatus,
}: {
    doc: Document;
    profiles: Record<string, Profile>;
    myStepStatus?: StepStatus;
}) {
    const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending;
    const completedSteps = doc.approval_steps.filter(s => s.status === 'approved').length;
    const totalSteps = doc.approval_steps.length;

    return (
        <Link
            href={`/approvals/${doc.id}`}
            className="group block rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.className}`}>
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground font-mono">#{doc.request_number}</span>
                                {myStepStatus === 'pending' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold animate-pulse">
                                        ● بانتظار موافقتك
                                    </span>
                                )}
                            </div>
                            <h3 className="font-semibold text-foreground mt-0.5 truncate group-hover:text-primary transition-colors">
                                {doc.title}
                            </h3>
                            {doc.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={doc.status} />
                        <ChevronLeft size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/50">
                    <StepProgress steps={doc.approval_steps} profiles={profiles} />
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users size={11} />
                            <span>{completedSteps}/{totalSteps} خطوة</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{formatDate(doc.created_at)}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Inbox size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'sent'>('pending');
    const [data, setData] = useState<{
        sent: Document[];
        pending: Document[];
        mySteps: { document_id: string; status: StepStatus }[];
        profiles: Record<string, Profile>;
        userId: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/approvals');
            if (!res.ok) throw new Error('فشل تحميل البيانات');
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Pending: docs where the user has a pending step
    const pendingDocs = data?.pending.filter(doc =>
        data.mySteps.some(s => s.document_id === doc.id && s.status === 'pending')
    ) ?? [];
    const myStepMap = Object.fromEntries(
        (data?.mySteps ?? []).map(s => [s.document_id, s.status])
    );

    // Stats
    const sentTotal = data?.sent.length ?? 0;
    const sentCompleted = data?.sent.filter(d => d.status === 'completed').length ?? 0;
    const pendingTotal = pendingDocs.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">الاعتمادات</h1>
                    <p className="text-sm text-muted-foreground mt-1">إدارة طلبات الاعتماد والموافقات</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                        title="تحديث"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
                    </button>
                    <Link
                        href="/approvals/new"
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        طلب جديد
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'إجمالي الطلبات', value: sentTotal, icon: Send, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'مكتملة', value: sentCompleted, icon: CheckCircle2, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
                    { label: 'تنتظر موافقتك', value: pendingTotal, icon: ClipboardCheck, color: pendingTotal > 0 ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted' },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{loading ? '–' : stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
                {[
                    { key: 'pending', label: 'تنتظر موافقتي', icon: Inbox, count: pendingTotal },
                    { key: 'sent', label: 'طلباتي', icon: Send, count: sentTotal },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={fetchData} className="mr-auto text-xs underline">إعادة المحاولة</button>
                </div>
            ) : loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                            <div className="flex gap-3">
                                <div className="h-10 w-10 rounded-lg bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 rounded bg-muted" />
                                    <div className="h-3 w-2/3 rounded bg-muted" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {activeTab === 'pending' && (
                        pendingDocs.length === 0
                            ? <EmptyState message="لا توجد طلبات تنتظر موافقتك حالياً" />
                            : pendingDocs.map(doc => (
                                <DocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    profiles={data?.profiles ?? {}}
                                    myStepStatus={myStepMap[doc.id]}
                                />
                            ))
                    )}
                    {activeTab === 'sent' && (
                        (data?.sent.length ?? 0) === 0
                            ? <EmptyState message="لم تقم بإرسال أي طلبات اعتماد بعد" />
                            : (data?.sent ?? []).map(doc => (
                                <DocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    profiles={data?.profiles ?? {}}
                                />
                            ))
                    )}
                </div>
            )}
        </div>
    );
}
