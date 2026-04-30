'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Archive,
    Search,
    FileText,
    MessageSquare,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Loader2,
    Calendar,
    Paperclip,
    Filter
} from 'lucide-react';

interface DocumentResult {
    id: string;
    request_number: number;
    title: string;
    description: string | null;
    status: string;
    file_name: string | null;
    created_at: string;
    profiles: { full_name: string | null } | null;
    steps: { status: string, comment: string | null, acted_at: string | null, profiles: { full_name: string | null } }[];
    matchType: string | null;
}

interface ChatResult {
    id: string;
    content: string;
    created_at: string;
    profiles: { full_name: string | null } | null;
    group_id: string | null;
}

export default function ArchivePage() {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, completed, cancelled, pending
    const [activeTab, setActiveTab] = useState<'docs' | 'chats'>('docs');
    
    const [data, setData] = useState<{ documents: DocumentResult[], chats: ChatResult[] }>({ documents: [], chats: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            params.append('status', statusFilter);

            const res = await fetch(`/api/archive?${params.toString()}`);
            const json = await res.json();
            
            if (!res.ok) throw new Error(json.error || 'فشل تحميل البيانات');
            
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [query, statusFilter]);

    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [fetchData]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header & Search */}
            <div className="flex flex-col gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Archive className="text-primary" size={24} />
                        الأرشيف والبحث الشامل
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        ابحث في طلبات الاعتماد، الملفات المرفقة، التعليقات، أو المحادثات
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                            type="text" 
                            placeholder="ابحث عن اسم ملف، محتوى رسالة، تعليق..." 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-12 rounded-xl border border-border bg-background py-2 pr-10 pl-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                        />
                        {loading && query && (
                            <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-12 appearance-none rounded-xl border border-border bg-background py-2 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer shadow-sm min-w-[140px]"
                            >
                                <option value="all">كل الحالات</option>
                                <option value="completed">المكتملة فقط</option>
                                <option value="cancelled">الملغاة / المرفوضة</option>
                                <option value="pending">قيد المراجعة</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Tabs for Results */}
                    {query && (
                        <div className="flex gap-2 border-b border-border pb-px">
                            <button
                                onClick={() => setActiveTab('docs')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                    activeTab === 'docs' 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                            >
                                <FileText size={16} />
                                الاعتمادات والملفات
                                <span className="bg-muted px-2 py-0.5 rounded-full text-xs ml-1">{data.documents.length}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('chats')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                    activeTab === 'chats' 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                            >
                                <MessageSquare size={16} />
                                المحادثات
                                <span className="bg-muted px-2 py-0.5 rounded-full text-xs ml-1">{data.chats.length}</span>
                            </button>
                        </div>
                    )}

                    {/* Results Container */}
                    <div className="min-h-[40vh]">
                        {loading && !data.documents.length && !data.chats.length ? (
                            <div className="flex justify-center py-20">
                                <Loader2 size={32} className="animate-spin text-primary" />
                            </div>
                        ) : activeTab === 'docs' ? (
                            data.documents.length === 0 ? (
                                <div className="text-center py-16 bg-card rounded-xl border border-border">
                                    <Archive className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-3" />
                                    <p className="text-muted-foreground">لا توجد طلبات اعتماد مطابقة للبحث</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {data.documents.map((doc) => (
                                        <Link 
                                            key={doc.id} 
                                            href={`/approvals/${doc.id}`}
                                            className="block bg-card hover:bg-accent/50 border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded-md">
                                                        #{doc.request_number}
                                                    </span>
                                                    <h3 className="font-bold text-foreground text-lg">{doc.title}</h3>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                    ${doc.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                                                      doc.status === 'in_progress' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                                                      doc.status === 'cancelled' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                                                      'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}>
                                                    {doc.status === 'completed' ? 'مكتمل' : 
                                                     doc.status === 'in_progress' ? 'قيد المراجعة' : 
                                                     doc.status === 'cancelled' ? 'ملغي' : 
                                                     doc.status === 'pending' ? 'بانتظار الاعتماد' : doc.status}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={14} />
                                                    {formatDate(doc.created_at)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <FileText size={14} />
                                                    المنشئ: {doc.profiles?.full_name || 'مجهول'}
                                                </span>
                                                {doc.file_name && (
                                                    <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                                        <Paperclip size={14} />
                                                        {doc.file_name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Approval History */}
                                            {doc.steps && doc.steps.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-border/50">
                                                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                                                        <CheckCircle2 size={14} className="text-muted-foreground" />
                                                        سجل الاعتمادات:
                                                    </p>
                                                    <div className="flex flex-col gap-2">
                                                        {doc.steps.filter(s => s.status !== 'waiting').map((step, idx) => (
                                                            <div key={idx} className="flex flex-col bg-muted/20 p-2.5 rounded-lg border border-border/40">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        {step.profiles?.full_name || 'مجهول'}
                                                                    </span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md
                                                                        ${step.status === 'approved' ? 'text-emerald-600 bg-emerald-500/10' : 
                                                                          step.status === 'rejected' ? 'text-red-600 bg-red-500/10' : 
                                                                          'text-amber-600 bg-amber-500/10'}`}>
                                                                        {step.status === 'approved' ? 'موافق' : step.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                                                    </span>
                                                                </div>
                                                                {step.comment && (
                                                                    <p className="text-xs text-muted-foreground mt-1.5 border-r-2 border-primary/30 pr-2 italic">
                                                                        "{step.comment}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {doc.steps.filter(s => s.status !== 'waiting').length === 0 && (
                                                            <span className="text-xs text-muted-foreground">لم يتم اتخاذ أي إجراء بعد.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Show matched snippet if query exists */}
                                            {query && doc.matchType && (
                                                <div className="mt-3 bg-primary/5 p-3 rounded-lg border border-primary/10">
                                                    <p className="text-xs font-semibold text-primary mb-1">
                                                        تم العثور عليه في: {doc.matchType}
                                                    </p>
                                                    {doc.matchType === 'تعليق' && doc.steps.some(s => s.comment?.toLowerCase().includes(query.toLowerCase())) && (
                                                        <div className="text-sm text-foreground/80 pr-2 border-r-2 border-primary/40 italic">
                                                            "{doc.steps.find(s => s.comment?.toLowerCase().includes(query.toLowerCase()))?.comment}"
                                                        </div>
                                                    )}
                                                    {doc.matchType === 'الوصف' && doc.description && (
                                                        <div className="text-sm text-foreground/80 line-clamp-2">
                                                            {doc.description}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )
                        ) : (
                            data.chats.length === 0 ? (
                                <div className="text-center py-16 bg-card rounded-xl border border-border">
                                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-3" />
                                    <p className="text-muted-foreground">لا توجد رسائل مطابقة للبحث</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {data.chats.map((chat) => (
                                        <Link
                                            key={chat.id}
                                            href={`/chat?group=${chat.group_id || 'dm'}`}
                                            className="block bg-card hover:bg-accent/50 border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-sm text-primary">
                                                    {chat.profiles?.full_name || 'مجهول'}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {formatDate(chat.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg">
                                                {chat.content}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
