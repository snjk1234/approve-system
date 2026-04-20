'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, Paperclip, MoreVertical, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChatWindowProps {
    chatId: string;
    currentUser: any;
    otherUser: any;
}

export function ChatWindow({ chatId, currentUser, otherUser }: ChatWindowProps) {
    const supabase = createClient();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!chatId) return;

        let channel: any;

        async function fetchMessages() {
            setLoading(true);
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
                
                // Mark messages as read
                const unreadMessages = data.filter(m => !m.is_read && m.sender_id !== currentUser.id);
                if (unreadMessages.length > 0) {
                    await supabase
                        .from('messages')
                        .update({ is_read: true })
                        .in('id', unreadMessages.map(m => m.id));
                }
            }
            setLoading(false);
            scrollToBottom();

            // Setup Realtime subscription
            channel = supabase.channel(`chat_${chatId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `chat_id=eq.${chatId}`
                    },
                    (payload) => {
                        const newMsg = payload.new;
                        setMessages((prev) => {
                            // Prevent duplicates if we already added it optimistically
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                        
                        // Mark as read if it's from the other person
                        if (newMsg.sender_id !== currentUser.id) {
                            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
                        }
                    }
                )
                .subscribe();
        }

        fetchMessages();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [chatId, currentUser.id, supabase]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId || !currentUser) return;

        const messageContent = newMessage.trim();
        setNewMessage('');
        setSending(true);

        // Optimistic UI update (optional, but good for UX)
        const tempId = `temp-${Date.now()}`;
        const tempMsg = {
            id: tempId,
            chat_id: chatId,
            sender_id: currentUser.id,
            content: messageContent,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        const { data, error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: currentUser.id,
                content: messageContent
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } else {
            // Replace temp message with actual
            setMessages(prev => prev.map(m => m.id === tempId ? data : m));
        }
        
        setSending(false);
    };

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

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header */}
            <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
                        {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt={otherUser.full_name} className="h-full w-full object-cover" />
                        ) : (
                            <User size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">{otherUser?.full_name || 'مستخدم غير معروف'}</h3>
                        <p className="text-[11px] text-emerald-500">متصل</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: '-19px -19px', opacity: 0.03 }}>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        <div className="text-center my-6">
                            <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">بداية المحادثة</span>
                        </div>
                        
                        {messages.map((msg) => {
                            const isMe = msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'} w-full`}>
                                    <div className={`max-w-[70%] sm:max-w-[60%] flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                                        <div 
                                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                                isMe 
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                    : 'bg-card border border-border/50 text-foreground rounded-tl-none'
                                            }`}
                                        >
                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1 px-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isMe && (
                                                <span className={`text-[10px] ${msg.is_read ? 'text-blue-500' : 'text-muted-foreground'}`}>
                                                    ✓✓
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border/50">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-card border border-border/50 p-2 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    <button type="button" className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-xl hover:bg-primary/10 shrink-0">
                        <Paperclip size={20} />
                    </button>
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="اكتب رسالة..."
                        className="flex-1 bg-transparent border-none focus:outline-none resize-none max-h-32 min-h-[40px] py-2 px-1 text-sm scrollbar-thin"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
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
