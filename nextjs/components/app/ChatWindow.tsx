'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, Paperclip, MoreVertical, User, Users, Mic, MicOff, Search, X, Pin, Reply, Trash2, SmilePlus, Clock } from 'lucide-react';

interface ChatWindowProps {
    chatId: string;
    currentUser: any;
    otherUser: any;
    onUnreadCleared?: () => void;
}

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export function ChatWindow({ chatId, currentUser, otherUser, onUnreadCleared }: ChatWindowProps) {
    const supabase = createClient();

    // Core state
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Unread tracking
    const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
    const unreadIdsRef = useRef<string[]>([]);
    const isMarkingRef = useRef(false);

    // Scroll refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Feature states
    const [isTyping, setIsTyping] = useState(false);          // other user typing
    const [replyTo, setReplyTo] = useState<any | null>(null); // reply-to message
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [pinnedMessage, setPinnedMessage] = useState<any | null>(null);
    const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
    const [otherUserProfile, setOtherUserProfile] = useState<any>(otherUser);
    const [isRecording, setIsRecording] = useState(false);
    const [chatMetadata, setChatMetadata] = useState<any>(null);
    const [ephemeralTime, setEphemeralTime] = useState<number | null>(null); // null = disabled, seconds otherwise
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialScrollPerformedRef = useRef<string | null>(null);

    // ── helpers ──────────────────────────────────────────────────────────────

    const setUnread = useCallback((ids: string[]) => {
        unreadIdsRef.current = ids;
    }, []);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const markUnreadAsRead = useCallback(async () => {
        if (isMarkingRef.current) return;
        const ids = [...unreadIdsRef.current];
        if (ids.length === 0) return;
        isMarkingRef.current = true;
        setUnread([]);
        setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
        await supabase.from('messages' as any).update({ is_read: true }).in('id', ids);
        onUnreadCleared?.();
        isMarkingRef.current = false;
    }, [supabase, setUnread, onUnreadCleared]);

    const handleScroll = useCallback(() => {
        const c = scrollContainerRef.current;
        if (!c) return;
        const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
        if (atBottom && unreadIdsRef.current.length > 0) markUnreadAsRead();
    }, [markUnreadAsRead]);

    // ── fetch messages + realtime ─────────────────────────────────────────────

    useEffect(() => {
        if (!chatId) return;
        let channel: any;

        async function init() {
            if (!chatId) return;
            setLoading(true);
            setMessages([]); // Clear old messages immediately
            setFirstUnreadId(null);
            setUnread([]);
            isMarkingRef.current = false;
            console.log("Initializing ChatWindow for:", chatId);

            // fetch messages (reply_to is optional - works even without migration 015)
            const { data, error: msgError } = await supabase
                .from('messages' as any)
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (msgError) {
                console.error('Messages fetch error in ChatWindow:', msgError);
            }

            if (data) {
                console.log("Messages received:", data.length);
                // Filter out deleted messages if column exists
                const visible = data.filter(m => !m.deleted_for_all);
                setMessages(visible);
                
                const unread = visible.filter((m: any) => !m.is_read && m.sender_id !== currentUser.id);
                console.log("Unread messages found:", unread.length);

                if (unread.length > 0) {
                    setUnread(unread.map((m: any) => m.id));
                    setFirstUnreadId(unread[0].id);
                }
            } else {
                console.log("No messages data found");
            }

            // fetch pinned message and chat metadata (optional - requires migration 015+)
            try {
                const { data: chatData, error: chatErr } = await supabase
                    .from('chats' as any).select('type, name, avatar_url, pinned_message_id')
                    .eq('id', chatId).single();
                
                if (chatData) {
                    setChatMetadata(chatData); // I need to add this state
                    if (chatData.pinned_message_id) {
                        const { data: pinMsg } = await supabase
                            .from('messages' as any).select('id,content,sender_id')
                            .eq('id', chatData.pinned_message_id).single();
                        if (pinMsg) setPinnedMessage(pinMsg);
                    }
                }
            } catch {}

            // fetch other user's online status (optional - requires migration 015)
            if (otherUser?.id) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles' as any).select('full_name,avatar_url,is_online,last_seen')
                        .eq('id', otherUser.id).single();
                    if (profile) setOtherUserProfile({ ...otherUser, ...profile });
                } catch {
                    // Columns don't exist yet, use passed otherUser prop
                }
            }

            setLoading(false);

            // realtime: new messages
            channel = supabase.channel(`chat_${chatId}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                    (payload: any) => {
                        const msg = payload.new;
                        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
                        if (msg.sender_id !== currentUser.id) {
                            const ids = [...unreadIdsRef.current, msg.id];
                            setUnread(ids);
                            setTimeout(() => handleScroll(), 60);
                        } else {
                            setTimeout(() => scrollToBottom(), 60);
                        }
                    })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                    (payload: any) => {
                        const updated = payload.new;
                        if (updated.deleted_for_all) {
                            setMessages(prev => prev.filter(m => m.id !== updated.id));
                        } else {
                            setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
                        }
                    })
                // typing indicator via broadcast
                .on('broadcast', { event: 'typing' }, (payload: any) => {
                    if (payload.payload?.user_id !== currentUser.id) {
                        setIsTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                    }
                })
                .subscribe();
        }

        init();

        // mark user online (optional - requires migration 015)
        try { supabase.rpc('update_user_presence', { user_id: currentUser.id, online: true }).then(); } catch {}

        return () => {
            if (channel) supabase.removeChannel(channel);
            try { supabase.rpc('update_user_presence', { user_id: currentUser.id, online: false }).then(); } catch {}
        };
    }, [chatId, currentUser.id]);

    // Dedicated effect for initial scrolling
    useLayoutEffect(() => {
        if (!chatId || loading || messages.length === 0) return;
        if (initialScrollPerformedRef.current === chatId) return;

        const performScroll = () => {
            if (firstUnreadId) {
                const el = document.getElementById(`msg-${firstUnreadId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'auto', block: 'center' });
                } else {
                    scrollToBottom('auto');
                }
            } else {
                scrollToBottom('auto');
            }
            initialScrollPerformedRef.current = chatId;
        };

        // Run immediately after layout paint
        performScroll();
        
        // Also a small timeout for components with dynamic height (images/voice)
        const t1 = setTimeout(performScroll, 100);
        const t2 = setTimeout(performScroll, 300);
        
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [chatId, loading, messages, firstUnreadId]);

    // ── typing broadcast ───────────────────────────────────────────────────────

    const handleTyping = (val: string) => {
        setNewMessage(val);
        supabase.channel(`chat_${chatId}`).send({
            type: 'broadcast', event: 'typing', payload: { user_id: currentUser.id }
        });
    };

    // ── send message ─────────────────────────────────────────────────────────

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !chatId) return;

        const content = newMessage.trim();
        const currentReplyTo = replyTo;
        setNewMessage('');
        setReplyTo(null);
        setSending(true);

        const tempId = `temp-${Date.now()}`;
        const tempMsg = { id: tempId, chat_id: chatId, sender_id: currentUser.id, content, created_at: new Date().toISOString(), is_read: false, reply_to_id: currentReplyTo?.id ?? null, reply_msg: currentReplyTo ?? null, reactions: {}, deleted_for_all: false };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        // Try with reply_to_id (requires migration 015), fallback to basic insert
        let data: any = null;
        let error: any = null;

        const insertPayload: any = { chat_id: chatId, sender_id: currentUser.id, content };
        if (currentReplyTo?.id) insertPayload.reply_to_id = currentReplyTo.id;
        
        if (ephemeralTime) {
            const expiresAt = new Date(Date.now() + ephemeralTime * 1000).toISOString();
            insertPayload.expires_at = expiresAt;
        }

        const result = await supabase.from('messages' as any).insert(insertPayload).select('*').single();
        data = result.data;
        error = result.error;

        if (error) {
            // If error due to unknown column, try without reply_to_id
            const fallbackPayload: any = { chat_id: chatId, sender_id: currentUser.id, content };
            if (ephemeralTime) {
                fallbackPayload.expires_at = new Date(Date.now() + ephemeralTime * 1000).toISOString();
            }
            const fallback = await supabase.from('messages' as any)
                .insert(fallbackPayload)
                .select('*').single();
            data = fallback.data;
            error = fallback.error;
        }

        if (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } else {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, reply_msg: currentReplyTo } : m));
        }
        setSending(false);
    };

    // ── reactions ────────────────────────────────────────────────────────────

    const handleReaction = async (msgId: string, emoji: string) => {
        setShowEmojiFor(null);
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;
        const current: Record<string, string[]> = msg.reactions ?? {};
        const users: string[] = current[emoji] ?? [];
        const updated = users.includes(currentUser.id)
            ? { ...current, [emoji]: users.filter(u => u !== currentUser.id) }
            : { ...current, [emoji]: [...users, currentUser.id] };
        // remove empty
        Object.keys(updated).forEach(k => { if ((updated[k] as string[]).length === 0) delete updated[k]; });
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: updated } : m));
        await supabase.from('messages' as any).update({ reactions: updated }).eq('id', msgId);
    };

    // ── delete for all ────────────────────────────────────────────────────────

    const handleDeleteForAll = async (msgId: string) => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        await supabase.from('messages' as any).update({ deleted_for_all: true }).eq('id', msgId);
    };

    // ── pin message ───────────────────────────────────────────────────────────

    const handlePin = async (msg: any) => {
        setPinnedMessage(msg);
        await supabase.from('chats' as any).update({ pinned_message_id: msg.id }).eq('id', chatId);
    };

    // ── voice recording ───────────────────────────────────────────────────────

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mr.ondataavailable = e => audioChunksRef.current.push(e.data);
            mr.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const path = `voice/${chatId}/${Date.now()}.webm`;
                const { error } = await supabase.storage.from('chat_attachments').upload(path, blob);
                if (!error) {
                    const { data: url } = supabase.storage.from('chat_attachments').getPublicUrl(path);
                    await supabase.from('messages' as any).insert({ chat_id: chatId, sender_id: currentUser.id, content: '🎙️ رسالة صوتية', voice_url: url.publicUrl, message_type: 'voice' });
                }
            };
            mr.start();
            mediaRecorderRef.current = mr;
            setIsRecording(true);
        } catch {
            alert('لا يمكن الوصول إلى الميكروفون');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
    };

    // ── filtered messages for search ──────────────────────────────────────────

    const displayMessages = searchQuery.trim()
        ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    // ── last seen helper ──────────────────────────────────────────────────────

    const formatLastSeen = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (diffMin < 1) return 'منذ لحظات';
        if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
        if (diffMin < 1440) return `منذ ${Math.floor(diffMin / 60)} ساعة`;
        return d.toLocaleDateString('ar-SA');
    };

    // ── empty state ───────────────────────────────────────────────────────────

    if (!chatId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 h-full">
                <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                    <User size={40} className="text-primary/40" />
                </div>
                <h3 className="text-xl font-bold text-foreground">اختر محادثة</h3>
                <p className="text-muted-foreground mt-2">اختر محادثة من القائمة أو ابدأ محادثة جديدة</p>
            </div>
        );
    }

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-background relative">

            {/* ── Header ── */}
            <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
                            {chatMetadata?.type === 'group' ? (
                                chatMetadata.avatar_url ? <img src={chatMetadata.avatar_url} alt="" className="h-full w-full object-cover" /> : <Users size={20} />
                            ) : (
                                otherUserProfile?.avatar_url
                                    ? <img src={otherUserProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                                    : <User size={20} />
                            )}
                        </div>
                        {chatMetadata?.type !== 'group' && otherUserProfile?.is_online && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">
                            {chatMetadata?.type === 'group' ? chatMetadata.name : (otherUserProfile?.full_name || 'مستخدم غير معروف')}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            {isTyping ? (
                                <span className="text-emerald-500 animate-pulse">يكتب الآن...</span>
                            ) : chatMetadata?.type === 'group' ? (
                                <span>مجموعة</span>
                            ) : otherUserProfile?.is_online ? (
                                <span className="text-emerald-500">متصل</span>
                            ) : otherUserProfile?.last_seen ? (
                                <span>آخر ظهور {formatLastSeen(otherUserProfile.last_seen)}</span>
                            ) : null}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowSearch(v => !v)} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <Search size={17} />
                    </button>
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>

            {/* ── Search bar ── */}
            {showSearch && (
                <div className="px-4 py-2 border-b border-border/50 bg-card/50 flex items-center gap-2">
                    <Search size={15} className="text-muted-foreground shrink-0" />
                    <input
                        autoFocus
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="ابحث في المحادثة..."
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} className="text-muted-foreground" /></button>}
                </div>
            )}

            {/* ── Pinned message ── */}
            {pinnedMessage && (
                <div className="px-4 py-2 border-b border-border/50 bg-amber-500/5 flex items-center gap-2 text-xs text-amber-600">
                    <Pin size={13} className="shrink-0" />
                    <span className="truncate flex-1">{pinnedMessage.content}</span>
                    <button onClick={() => { setPinnedMessage(null); supabase.from('chats' as any).update({ pinned_message_id: null }).eq('id', chatId).then(); }}>
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* ── Messages Area ── */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 relative scroll-smooth"
                onClick={() => setShowEmojiFor(null)}
            >
                <div className="absolute inset-0 pointer-events-none z-0"
                    style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: '-19px -19px', opacity: 0.03 }} />

                <div className="relative z-10 space-y-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="text-center my-6">
                                <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">بداية المحادثة</span>
                            </div>

                            {displayMessages.map((msg) => {
                                const isMe = msg.sender_id === currentUser.id;
                                const isFirstUnread = msg.id === firstUnreadId && !searchQuery;
                                const reactions: Record<string, string[]> = msg.reactions ?? {};

                                return (
                                    <div key={msg.id} id={`msg-${msg.id}`} className="w-full">

                                        {/* Unread separator */}
                                        {isFirstUnread && (
                                            <div className="flex items-center gap-3 my-5">
                                                <div className="flex-1 border-t border-red-500/30" />
                                                <span className="text-[11px] font-medium text-red-500 bg-red-500/10 px-3 py-0.5 rounded-full whitespace-nowrap">رسائل غير مقروءة</span>
                                                <div className="flex-1 border-t border-red-500/30" />
                                            </div>
                                        )}

                                        {/* Message bubble */}
                                        <div className={`flex ${isMe ? 'justify-start' : 'justify-end'} w-full group mb-1`}>

                                            {/* Action buttons (appear on hover) */}
                                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mx-2 order-${isMe ? '2' : '0'}`}>
                                                <button onClick={e => { e.stopPropagation(); setReplyTo(msg); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground" title="رد">
                                                    <Reply size={14} />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); setShowEmojiFor(v => v === msg.id ? null : msg.id); }} className="p-1 rounded-md hover:bg-muted text-muted-foreground" title="تفاعل">
                                                    <SmilePlus size={14} />
                                                </button>
                                                <button onClick={() => handlePin(msg)} className="p-1 rounded-md hover:bg-muted text-muted-foreground" title="تثبيت">
                                                    <Pin size={14} />
                                                </button>
                                                {isMe && (
                                                    <button onClick={() => handleDeleteForAll(msg.id)} className="p-1 rounded-md hover:bg-muted text-red-400" title="حذف للجميع">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className={`max-w-[70%] sm:max-w-[60%] flex flex-col ${isMe ? 'items-start' : 'items-end'} relative`}>

                                                {/* Emoji picker */}
                                                {showEmojiFor === msg.id && (
                                                    <div onClick={e => e.stopPropagation()} className={`absolute ${isMe ? 'left-0' : 'right-0'} -top-10 z-20 flex gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg`}>
                                                        {EMOJIS.map(em => (
                                                            <button key={em} onClick={() => handleReaction(msg.id, em)} className="hover:scale-125 transition-transform text-base">{em}</button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reply preview */}
                                                {msg.reply_msg && (
                                                    <div className={`mb-1 px-3 py-1.5 rounded-lg border-r-2 border-primary bg-muted/50 text-xs text-muted-foreground max-w-full truncate`}>
                                                        {msg.reply_msg.content}
                                                    </div>
                                                )}

                                                {/* Bubble */}
                                                <div
                                                    className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                                                    style={isMe
                                                        ? { backgroundColor: '#b91c1c', color: '#ffffff' }
                                                        : { backgroundColor: '#ffffff', color: '#1a1a1a', border: '1px solid #e5e5e5' }}
                                                >
                                                    {/* Voice message */}
                                                    {msg.message_type === 'voice' && msg.voice_url ? (
                                                        <audio controls src={msg.voice_url} className="h-8 max-w-[200px]" />
                                                    ) : (
                                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                                    )}
                                                </div>

                                                {/* Reactions display */}
                                                {Object.keys(reactions).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Object.entries(reactions).map(([em, users]) => (
                                                            <button
                                                                key={em}
                                                                onClick={() => handleReaction(msg.id, em)}
                                                                className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${(users as string[]).includes(currentUser.id) ? 'bg-primary/10 border-primary/30' : 'bg-muted border-border'}`}
                                                            >
                                                                {em} <span className="text-[10px]">{(users as string[]).length}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Time + read receipt */}
                                                <div className="flex items-center gap-1 mt-0.5 px-1">
                                                    {msg.expires_at && (
                                                        <Clock size={10} className="text-amber-500 animate-pulse mr-1" />
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && (
                                                        <span className={`text-[10px] ${msg.is_read ? 'text-blue-500' : 'text-muted-foreground'}`}>✓✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </div>

            {/* ── Input Area ── */}
            <div className="p-4 bg-background border-t border-border/50">
                {/* Reply preview bar */}
                {replyTo && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-muted/50 border-r-2 border-primary text-sm">
                        <Reply size={14} className="text-primary shrink-0" />
                        <span className="flex-1 truncate text-muted-foreground">{replyTo.content}</span>
                        <button onClick={() => setReplyTo(null)}><X size={14} /></button>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-card border border-border/50 p-2 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    {/* Voice button */}
                    <button
                        type="button"
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`p-2 transition-colors rounded-xl shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                        title="اضغط مع الاستمرار للتسجيل"
                    >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Ephemeral Toggle */}
                    <div className="relative">
                        <button 
                            type="button"
                            onClick={() => {
                                if (!ephemeralTime) setEphemeralTime(60);
                                else if (ephemeralTime === 60) setEphemeralTime(3600);
                                else if (ephemeralTime === 3600) setEphemeralTime(86400);
                                else setEphemeralTime(null);
                            }}
                            className={`p-2 transition-all rounded-xl shrink-0 ${ephemeralTime ? 'bg-amber-500 text-white shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}
                            title="الرسائل المؤقتة"
                        >
                            <Clock size={20} />
                            {ephemeralTime && (
                                <span className="absolute -top-1 -right-1 bg-white text-amber-500 text-[8px] font-bold px-1 rounded-full border border-amber-500">
                                    {ephemeralTime === 60 ? '1m' : ephemeralTime === 3600 ? '1h' : '1d'}
                                </span>
                            )}
                        </button>
                    </div>

                    <button type="button" className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/10 shrink-0">
                        <Paperclip size={20} />
                    </button>

                    <textarea
                        value={newMessage}
                        onChange={e => handleTyping(e.target.value)}
                        placeholder="اكتب رسالة..."
                        className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 min-h-[40px] py-2 px-1 text-sm"
                        rows={1}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />

                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md shadow-primary/20"
                    >
                        <Send size={18} className="rtl:rotate-180" />
                    </button>
                </form>
            </div>
        </div>
    );
}
