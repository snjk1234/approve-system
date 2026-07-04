'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowRight,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    FileText,
    User,
    Loader2,
    MessageSquare,
    Calendar,
    Hash,
    ChevronRight,
    Paperclip,
    ExternalLink,
    Edit,
    Trash2,
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
    created_at: string;
}

interface Document {
    id: string;
    request_number: number;
    title: string;
    description: string | null;
    status: DocStatus;
    file_url: string | null;
    file_name: string | null;
    creator_id: string;
    created_at: string;
    updated_at: string;
    approval_steps: ApprovalStep[];
}

interface Profile {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOC_STATUS: Record<DocStatus, { label: string; className: string }> = {
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    in_progress: { label: 'جاري', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    paused: { label: 'تحتاج تعديل', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    completed: { label: 'مكتمل ✓', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    cancelled: { label: 'مرفوض', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const STEP_CONFIG: Record<StepStatus, { label: string; icon: typeof Clock; iconClass: string; borderClass: string; bgClass: string }> = {
    waiting: { label: 'في الانتظار', icon: Clock, iconClass: 'text-muted-foreground', borderClass: 'border-border', bgClass: 'bg-muted/30' },
    pending: { label: 'قيد المراجعة', icon: AlertCircle, iconClass: 'text-primary', borderClass: 'border-primary/40', bgClass: 'bg-primary/5' },
    approved: { label: 'تمت الموافقة', icon: CheckCircle2, iconClass: 'text-green-500', borderClass: 'border-green-300 dark:border-green-700', bgClass: 'bg-green-50 dark:bg-green-900/20' },
    rejected: { label: 'مرفوض', icon: XCircle, iconClass: 'text-red-500', borderClass: 'border-red-300 dark:border-red-700', bgClass: 'bg-red-50 dark:bg-red-900/20' },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getInitials(name: string | null | undefined) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
                <Icon size={14} />
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
            </div>
        </div>
    );
}

function StepCard({ step, profile, isCurrentUser }: { step: ApprovalStep; profile?: Profile; isCurrentUser: boolean }) {
    const cfg = STEP_CONFIG[step.status];
    const Icon = cfg.icon;

    return (
        <div className={`flex gap-4 rounded-xl border ${cfg.borderClass} ${cfg.bgClass} p-4 transition-all`}>
            {/* Sequence */}
            <div className="flex flex-col items-center gap-2 shrink-0">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    step.status === 'approved' ? 'border-green-400 bg-green-400 text-white' :
                    step.status === 'rejected' ? 'border-red-400 bg-red-400 text-white' :
                    step.status === 'pending' ? 'border-primary bg-primary text-primary-foreground' :
                    'border-border bg-muted text-muted-foreground'
                } text-xs font-bold`}>
                    {step.sequence}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold`}>
                            {getInitials(profile?.full_name)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                {profile?.full_name || 'غير معروف'}
                                {isCurrentUser && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-normal">أنت</span>
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Icon size={14} className={cfg.iconClass} />
                        <span className={`text-xs font-medium ${cfg.iconClass}`}>{cfg.label}</span>
                    </div>
                </div>

                {step.comment && renderComments(step.comment)}

                {step.acted_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                        {step.status === 'approved' ? 'وافق بتاريخ' : 'رفض بتاريخ'}: {formatDate(step.acted_at)}
                    </p>
                )}
            </div>
        </div>
    );
}

function renderComments(commentString: string) {
    try {
        const list = JSON.parse(commentString);
        if (Array.isArray(list)) {
            return (
                <div className="mt-3 space-y-2">
                    {list.map((c: any, index: number) => (
                        <div key={index} className="rounded-lg bg-muted/40 p-2.5 border-r-2 border-primary/25 text-right space-y-1">
                            <div className="flex justify-between items-center text-xs font-semibold text-foreground/90">
                                <span>{c.user_name} ({c.action})</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {new Date(c.created_at).toLocaleDateString('ar-EG')} {new Date(c.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed font-normal">{c.comment}</p>
                        </div>
                    ))}
                </div>
            );
        }
    } catch (_) {}

    return (
        <div className="mt-3 flex gap-2">
            <MessageSquare size={13} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 italic">"{commentString}"</p>
        </div>
    );
}

// ─── Action Panel ─────────────────────────────────────────────────────────────

function ActionPanel({ docId, onDone }: { docId: string; onDone: () => void }) {
    const [action, setAction] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit() {
        if (!action) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/approvals/${docId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, comment }),
            });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || 'حدث خطأ');
            onDone();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-primary" />
                <h3 className="font-semibold text-foreground text-sm">هذا الطلب يحتاج موافقتك</h3>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2.5">
                <button
                    type="button"
                    onClick={() => setAction(action === 'approve' ? null : 'approve')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border-2 transition-all ${
                        action === 'approve'
                            ? 'bg-green-500 border-green-500 text-white shadow-sm'
                            : 'border-green-400/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                >
                    <CheckCircle2 size={15} />
                    الموافقة
                </button>
                <button
                    type="button"
                    onClick={() => setAction(action === 'request_changes' ? null : 'request_changes')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border-2 transition-all ${
                        action === 'request_changes'
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'border-amber-400/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}
                >
                    <Edit size={15} />
                    طلب تعديل
                </button>
                <button
                    type="button"
                    onClick={() => setAction(action === 'reject' ? null : 'reject')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border-2 transition-all ${
                        action === 'reject'
                            ? 'bg-red-500 border-red-500 text-white shadow-sm'
                            : 'border-red-400/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                >
                    <XCircle size={15} />
                    الرفض
                </button>
            </div>

            {/* Comment */}
            {action && (
                <div className="space-y-2 animate-appear">
                    <label className="text-xs font-medium text-foreground">
                        {action === 'reject' ? 'سبب الرفض *' : action === 'request_changes' ? 'التعديل المطلوب *' : 'ملاحظة (اختياري)'}
                    </label>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder={action === 'reject' ? 'يرجى ذكر سبب الرفض...' : action === 'request_changes' ? 'يرجى توضيح التعديلات المطلوبة بالتفصيل...' : 'أضف ملاحظة...'}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-all"
                    />

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || ((action === 'reject' || action === 'request_changes') && !comment.trim())}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ${
                            action === 'approve'
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : action === 'reject'
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                    >
                        {submitting ? (
                            <><Loader2 size={15} className="animate-spin" /> جاري الإرسال...</>
                        ) : action === 'approve' ? (
                            <><CheckCircle2 size={15} /> تأكيد الموافقة</>
                        ) : action === 'reject' ? (
                            <><XCircle size={15} /> تأكيد الرفض</>
                        ) : (
                            <><Edit size={15} /> تأكيد طلب التعديل</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Resubmit Panel ───────────────────────────────────────────────────────────

function ResubmitPanel({ docId, onDone }: { docId: string; onDone: () => void }) {
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const supabase = createClient();

    async function handleResubmit() {
        setSubmitting(true);
        setError(null);
        try {
            let uploadedUrls: { name: string; url: string }[] = [];

            if (files.length > 0) {
                for (const file of files) {
                    const ext = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${ext}`;
                    const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
                    if (uploadError) throw new Error(`فشل رفع الملف ${file.name}`);
                    
                    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
                    uploadedUrls.push({ name: file.name, url: publicUrl });
                }
            }

            const payload: any = { comment };
            if (uploadedUrls.length > 0) {
                payload.file_url = JSON.stringify(uploadedUrls);
                payload.file_name = `${uploadedUrls.length} مرفقات`;
            }

            const res = await fetch(`/api/approvals/${docId}/resubmit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || 'حدث خطأ أثناء استكمال الطلب');
            onDone();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
                <Edit size={16} />
                <h3 className="font-semibold text-sm">طلب تعديل على المراسلة</h3>
            </div>
            <p className="text-xs text-muted-foreground">
                طلب المعتمد تعديلاً على المراسلة. يرجى تعديل المطلوب في المرفقات أو تفاصيل المراسلة ثم الضغط على زر استكمال المراسلة لإعادة إرسالها.
            </p>

            <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">المرفقات الجديدة (اختياري، استبدال المرفقات القديمة)</label>
                <div className="flex flex-col gap-3">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/30 hover:border-amber-500 bg-background hover:bg-amber-500/5 px-4 py-4 text-xs text-muted-foreground hover:text-amber-600 transition-all">
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const selectedFiles = e.target.files;
                                if (selectedFiles && selectedFiles.length > 0) {
                                    const newFilesArray = Array.from(selectedFiles);
                                    setFiles(prev => [...prev, ...newFilesArray]);
                                }
                                e.target.value = '';
                            }}
                        />
                        <Paperclip size={14} />
                        <span>اضغط لاختيار ملفات جديدة لتغيير المستندات الحالية</span>
                    </label>

                    {files.length > 0 && (
                        <div className="space-y-1.5">
                            {files.map((file, i) => (
                                <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                        <Paperclip size={12} className="text-muted-foreground shrink-0" />
                                        <span className="truncate text-foreground">{file.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                                        className="text-muted-foreground hover:text-destructive p-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">تعليق الاستكمال (اختياري)</label>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="أضف توضيحاً حول التعديل الذي قمت به..."
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-all"
                />
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <button
                onClick={handleResubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
                {submitting ? (
                    <><Loader2 size={15} className="animate-spin" /> جاري الاستكمال...</>
                ) : (
                    <><CheckCircle2 size={15} /> استكمال المراسلة (تم التعديل)</>
                )}
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<{
        document: Document;
        profiles: Record<string, Profile>;
        userId: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/approvals/${id}`);
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || 'فشل تحميل البيانات');
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time subscription
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel(`approval_detail_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `id=eq.${id}` }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_steps', filter: `document_id=eq.${id}` }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <AlertCircle size={32} className="text-destructive" />
                <p className="text-sm text-destructive">{error || 'لم يتم العثور على الطلب'}</p>
                <button onClick={() => router.back()} className="text-sm text-primary underline">العودة</button>
            </div>
        );
    }

    const { document: doc, profiles, userId } = data;
    const docStatus = DOC_STATUS[doc.status] ?? DOC_STATUS.pending;
    const sortedSteps = [...doc.approval_steps].sort((a, b) => a.sequence - b.sequence);
    const isCreator = doc.creator_id === userId;
    const myPendingStep = sortedSteps.find(s => s.approver_id === userId && s.status === 'pending');
    const canAct = !!myPendingStep && doc.status === 'in_progress';

    const completedCount = sortedSteps.filter(s => s.status === 'approved').length;

    let attachments: { name: string; url: string }[] = [];
    if (doc.file_url) {
        try {
            attachments = JSON.parse(doc.file_url);
            if (!Array.isArray(attachments)) {
                attachments = [{ name: doc.file_name || 'مرفق', url: doc.file_url }];
            }
        } catch {
            attachments = [{ name: doc.file_name || 'مرفق', url: doc.file_url }];
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                    <ArrowRight size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">طلب رقم #{doc.request_number}</span>
                        <ChevronRight size={12} className="text-muted-foreground" />
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${docStatus.className}`}>
                            {docStatus.label}
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground mt-0.5 truncate">{doc.title}</h1>
                </div>
            </div>

            {/* Action Panel - shown when user has a pending step */}
            {canAct && (
                <ActionPanel docId={doc.id} onDone={fetchData} />
            )}

            {isCreator && doc.status === 'paused' && (
                <ResubmitPanel docId={doc.id} onDone={fetchData} />
            )}

            {/* Document Info */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText size={15} className="text-muted-foreground" />
                    تفاصيل الطلب
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow
                        icon={Hash}
                        label="رقم الطلب"
                        value={`#${doc.request_number}`}
                    />
                    <InfoRow
                        icon={Calendar}
                        label="تاريخ الإنشاء"
                        value={formatDate(doc.created_at)}
                    />
                    <InfoRow
                        icon={User}
                        label="مقدم الطلب"
                        value={
                            <span className="flex items-center gap-1.5">
                                {profiles[doc.creator_id]?.full_name || 'غير معروف'}
                                {isCreator && <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">أنت</span>}
                            </span>
                        }
                    />
                    <InfoRow
                        icon={CheckCircle2}
                        label="التقدم"
                        value={`${completedCount} / ${sortedSteps.length} خطوة`}
                    />
                </div>

                {doc.description && (
                    <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">الوصف</p>
                        <p className="text-sm text-foreground">{doc.description}</p>
                    </div>
                )}

                {attachments.length > 0 && (
                    <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">المرفقات</p>
                        <div className="flex flex-col gap-2">
                            {attachments.map((file, i) => (
                                <a
                                    key={i}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between rounded-lg border border-border bg-background hover:bg-accent px-3 py-2 text-sm transition-colors group"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Paperclip size={14} className="text-muted-foreground shrink-0" />
                                        <span className="truncate text-foreground group-hover:text-primary transition-colors">{file.name}</span>
                                    </div>
                                    <ExternalLink size={14} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                {sortedSteps.length > 0 && (
                    <div className="pt-2">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${(completedCount / sortedSteps.length) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-left">
                            {Math.round((completedCount / sortedSteps.length) * 100)}% مكتمل
                        </p>
                    </div>
                )}
            </div>

            {/* Approval Chain */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User size={15} className="text-muted-foreground" />
                    سلسلة المراسلة
                    <span className="text-xs text-muted-foreground font-normal">({sortedSteps.length} معتمد)</span>
                </h2>

                <div className="space-y-2">
                    {sortedSteps.map((step) => (
                        <StepCard
                            key={step.id}
                            step={step}
                            profile={profiles[step.approver_id]}
                            isCurrentUser={step.approver_id === userId}
                        />
                    ))}
                </div>

                {sortedSteps.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد خطوات مراسلة</p>
                )}
            </div>

            {/* Comments Timeline */}
            <UnifiedCommentsList steps={sortedSteps} creator={profiles[doc.creator_id]} />
        </div>
    );
}

function UnifiedCommentsList({ steps, creator }: { steps: ApprovalStep[]; creator?: Profile }) {
    const allComments: any[] = [];
    
    steps.forEach((step) => {
        if (!step.comment) return;
        try {
            const parsed = JSON.parse(step.comment);
            if (Array.isArray(parsed)) {
                allComments.push(...parsed);
            } else {
                allComments.push({
                    user_name: 'معتمد',
                    action: step.status === 'approved' ? 'موافقة' : step.status === 'rejected' ? 'رفض' : 'تعليق سابق',
                    comment: step.comment,
                    created_at: step.acted_at || new Date().toISOString()
                });
            }
        } catch (_) {
            allComments.push({
                user_name: 'معتمد',
                action: step.status === 'approved' ? 'موافقة' : step.status === 'rejected' ? 'رفض' : 'تعليق سابق',
                comment: step.comment,
                created_at: step.acted_at || new Date().toISOString()
            });
        }
    });

    allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (allComments.length === 0) return null;

    return (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
                <MessageSquare className="text-primary" size={18} />
                <h3 className="font-bold text-sm text-foreground">سلسلة التعليقات والملاحظات</h3>
            </div>
            <div className="space-y-4 relative before:absolute before:inset-y-0 before:right-3.5 before:w-0.5 before:bg-border">
                {allComments.map((c, index) => {
                    return (
                        <div key={index} className="relative flex gap-3 pr-8 text-right">
                            <div className="absolute right-1.5 top-1.5 h-4.5 w-4.5 rounded-full border-2 border-background bg-primary flex items-center justify-center shrink-0">
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <div className="flex-1 rounded-xl bg-secondary/30 p-3 space-y-1.5 border border-border">
                                <div className="flex justify-between items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-foreground">{c.user_name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                            c.action === 'موافقة' ? 'bg-green-500/10 text-green-600' :
                                            c.action === 'طلب تعديل' ? 'bg-amber-500/10 text-amber-600' :
                                            c.action === 'استكمال' || c.action === 'استكمال المراسلة' ? 'bg-blue-500/10 text-blue-600' :
                                            'bg-red-500/10 text-red-600'
                                        }`}>
                                            {c.action}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(c.created_at).toLocaleDateString('ar-EG')} {new Date(c.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed font-normal">{c.comment}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
