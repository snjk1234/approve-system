'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, User, Plus, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NewChatModal } from '@/components/app/NewChatModal';

interface ChatListProps {
    onSelectChat: (chatId: string, otherUser: any) => void;
    selectedChatId?: string | null;
}

export function ChatList({ onSelectChat, selectedChatId }: ChatListProps) {
    const supabase = createClient();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchChats = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            setCurrentUser(user);

            // Fetch chat participants for the current user
            const { data: participations } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', user.id);

            if (participations && participations.length > 0) {
                const chatIds = participations.map(p => p.chat_id);
                
                // Fetch chats with their other participants and last message
                const { data: chatsData } = await supabase
                    .from('chats')
                    .select(`
                        id,
                        created_at,
                        chat_participants!inner(user_id, profiles!inner(full_name, avatar_url)),
                        messages(content, created_at, is_read, sender_id)
                    `)
                    .in('id', chatIds)
                    .order('created_at', { foreignTable: 'messages', ascending: false });

                if (chatsData) {
                    const formattedChats = chatsData.map((chat: any) => {
                        // Find the other participant
                        const otherParticipant = chat.chat_participants.find((p: any) => p.user_id !== user.id);
                        
                        // Sort messages to get the latest one safely
                        const sortedMessages = chat.messages ? [...chat.messages].sort((a: any, b: any) => 
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        ) : [];
                        
                        const lastMessage = sortedMessages[0];
                        const unreadCount = sortedMessages.filter((m: any) => !m.is_read && m.sender_id !== user.id).length;

                        return {
                            id: chat.id,
                            otherUser: otherParticipant ? {
                                id: otherParticipant.user_id,
                                ...otherParticipant.profiles
                            } : { full_name: 'مستخدم غير معروف' },
                            lastMessage,
                            unreadCount,
                            updated_at: lastMessage ? lastMessage.created_at : chat.created_at
                        };
                    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

                    setChats(formattedChats);
                } else {
                    setChats([]);
                }
            } else {
                setChats([]);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
            setChats([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredChats = chats.filter(chat => 
        chat.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetchChats();
        // Optional: Subscribe to new messages to update the list unread count
    }, []);


    const handleChatCreated = (chatId: string, otherUser: any) => {
        fetchChats(); // Refresh list to include the new chat
        onSelectChat(chatId, otherUser);
    };

    return (
        <div className="flex flex-col h-full border-l border-border/50 bg-card/50 relative">
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-bold text-lg">المحادثات</h2>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border/50">
                <div className="relative">
                    <Input
                        placeholder="ابحث في المحادثات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-9 h-10 rounded-xl bg-background"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredChats.length > 0 ? (
                    <div className="space-y-1">
                        {filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => onSelectChat(chat.id, chat.otherUser)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-right ${
                                    selectedChatId === chat.id 
                                        ? 'bg-primary/10 border border-primary/20' 
                                        : 'hover:bg-muted/50 border border-transparent'
                                }`}
                            >
                                <div className="relative">
                                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                        {chat.otherUser?.avatar_url ? (
                                            <img src={chat.otherUser.avatar_url} alt={chat.otherUser.full_name} className="h-full w-full object-cover" />
                                        ) : (
                                            <User size={20} />
                                        )}
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white">
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-sm truncate">{chat.otherUser?.full_name}</h3>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mr-2">
                                            {chat.lastMessage ? new Date(chat.lastMessage.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                        {chat.lastMessage?.content || 'بدأت المحادثة'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8 text-muted-foreground">
                        <MessageSquare className="mx-auto mb-3 opacity-20" size={32} />
                        <p className="text-sm">لا توجد محادثات</p>
                        <p className="text-xs mt-1">اضغط على زر + لبدء محادثة</p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <NewChatModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onChatCreated={handleChatCreated}
                currentUser={currentUser}
            />
        </div>
    );
}
