'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowRight,
    Plus,
    X,
    Loader2,
    Search,
    GripVertical,
    CheckCircle2,
    AlertCircle,
    FileText,
    User,
    ChevronDown,
    ChevronUp,
    Paperclip,
    Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    role: string | null;
    department_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('');
}

function UserAvatar({ user, size = 'md' }: { user: UserProfile; size?: 'sm' | 'md' }) {
    const s = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
    return (
        <div className={`${s} flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold`}>
            {getInitials(user.full_name)}
        </div>
    );
}

// ─── Approver Row in the selected list ────────────────────────────────────────

function ApproverItem({
    user,
    index,
    total,
    onRemove,
    onMoveUp,
    onMoveDown,
}: {
    user: UserProfile;
    index: number;
    total: number;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 group">
            {/* Sequence badge */}
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {index + 1}
            </div>

            <UserAvatar user={user} />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.full_name || 'بدون اسم'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Reorder */}
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={index === 0}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronUp size={14} />
                </button>
                <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronDown size={14} />
                </button>
            </div>

            <button
                type="button"
                onClick={onRemove}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewApprovalPage() {
    const router = useRouter();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedApprovers, setSelectedApprovers] = useState<UserProfile[]>([]);
    const [files, setFiles] = useState<File[]>([]);

    // User search state
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    // Submit state
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Load users
    const loadUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/approvals/users');
            const json = await res.json();
            setAllUsers(json.users || []);
        } catch {
            // silent
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // Filtered users for picker
    const selectedIds = new Set(selectedApprovers.map(u => u.id));
    const filteredUsers = allUsers.filter(u =>
        !selectedIds.has(u.id) &&
        (
            !search ||
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
        )
    );

    // Handlers
    function addApprover(user: UserProfile) {
        setSelectedApprovers(prev => [...prev, user]);
        setSearch('');
    }

    function removeApprover(id: string) {
        setSelectedApprovers(prev => prev.filter(u => u.id !== id));
    }

    function moveApprover(index: number, direction: 'up' | 'down') {
        const newList = [...selectedApprovers];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
        setSelectedApprovers(newList);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError(null);

        if (!title.trim()) {
            setSubmitError('العنوان مطلوب');
            return;
        }
        if (selectedApprovers.length === 0) {
            setSubmitError('يجب إضافة معتمد واحد على الأقل');
            return;
        }

        setSubmitting(true);
        try {
            const supabase = createClient();
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

            const res = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    approvers: selectedApprovers.map(u => u.id),
                    file_url: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null,
                    file_name: uploadedUrls.length > 0 ? `${uploadedUrls.length} مرفقات` : null,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || 'فشل إنشاء الطلب');
            setSuccess(true);
            setTimeout(() => router.push('/approvals'), 1200);
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-appear-zoom">
                    <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">تم إرسال الطلب بنجاح</h2>
                <p className="text-sm text-muted-foreground">سيتم توجيهك إلى قائمة الاعتمادات...</p>
            </div>
        );
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
                <div>
                    <h1 className="text-2xl font-bold text-foreground">طلب اعتماد جديد</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">إنشاء مسار اعتماد تسلسلي</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Document Info */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText size={15} />
                        </div>
                        <h2 className="font-semibold text-foreground text-sm">معلومات الوثيقة</h2>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-foreground" htmlFor="approval-title">
                            العنوان <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="approval-title"
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="مثال: طلب شراء أجهزة حاسوب"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            maxLength={200}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-foreground" htmlFor="approval-desc">
                            الوصف <span className="text-muted-foreground text-xs">(اختياري)</span>
                        </label>
                        <textarea
                            id="approval-desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="أضف تفاصيل إضافية حول الطلب..."
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                            maxLength={1000}
                        />
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-2 pt-2 border-t border-border">
                        <label className="block text-sm font-medium text-foreground">
                            المرفقات <span className="text-muted-foreground text-xs">(اختياري)</span>
                        </label>
                        <div className="flex flex-col gap-3">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border hover:border-primary bg-background hover:bg-primary/5 px-4 py-6 text-sm text-muted-foreground hover:text-primary transition-all">
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
                                        e.target.value = ''; // reset so the same file can be chosen again
                                    }}
                                />
                                <Paperclip size={18} />
                                <span>اضغط لاختيار ملفات أو اسحب وأفلت هنا</span>
                            </label>

                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                <Paperclip size={14} className="text-muted-foreground shrink-0" />
                                                <span className="truncate text-foreground">{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                                                className="text-muted-foreground hover:text-destructive p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Approvers */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <User size={15} />
                            </div>
                            <h2 className="font-semibold text-foreground text-sm">سلسلة الاعتماد</h2>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {selectedApprovers.length > 0 ? `${selectedApprovers.length} معتمد` : 'لا يوجد'}
                        </span>
                    </div>

                    {/* Selected approvers */}
                    {selectedApprovers.length > 0 && (
                        <div className="space-y-2">
                            {selectedApprovers.map((user, idx) => (
                                <ApproverItem
                                    key={user.id}
                                    user={user}
                                    index={idx}
                                    total={selectedApprovers.length}
                                    onRemove={() => removeApprover(user.id)}
                                    onMoveUp={() => moveApprover(idx, 'up')}
                                    onMoveDown={() => moveApprover(idx, 'down')}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add approver button / picker */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowPicker(!showPicker)}
                            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border hover:border-primary bg-background hover:bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary transition-all"
                        >
                            <Plus size={16} />
                            إضافة معتمد
                        </button>

                        {showPicker && (
                            <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                                {/* Search */}
                                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                                    <Search size={15} className="text-muted-foreground shrink-0" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="بحث بالاسم أو البريد..."
                                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setShowPicker(false); setSearch(''); }}
                                        className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* User list */}
                                <div className="max-h-56 overflow-y-auto">
                                    {usersLoading ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 size={18} className="animate-spin text-primary" />
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                            {search ? 'لا توجد نتائج' : 'لا يوجد مستخدمون آخرون'}
                                        </div>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => { addApprover(user); setShowPicker(false); }}
                                                className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-right"
                                            >
                                                <UserAvatar user={user} size="sm" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {user.full_name || 'بدون اسم'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedApprovers.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                            سيتم إرسال الطلب للمعتمدين بالترتيب المحدد أعلاه
                        </p>
                    )}
                </div>

                {/* Error */}
                {submitError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        <AlertCircle size={16} />
                        {submitError}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting || !title.trim() || selectedApprovers.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            جاري الإرسال...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={16} />
                            إرسال طلب الاعتماد
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
