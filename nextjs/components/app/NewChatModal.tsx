'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, User, X, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: (chatId: string, otherUser: any) => void;
    currentUser: any;
}

export function NewChatModal({ isOpen, onClose, onChatCreated, currentUser }: NewChatModalProps) {
    const supabase = createClient();
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!isOpen || !currentUser) return;

        async function fetchUsers() {
            setLoading(true);
            // Fetch all users except current user
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, departments(name)')
                .neq('id', currentUser.id)
                .eq('is_active', true)
                .order('full_name');
                
            if (data) {
                setUsers(data);
            }
            setLoading(false);
        }

        fetchUsers();
    }, [isOpen, currentUser]);

    const filteredUsers = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.departments?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleStartChat = async (selectedUser: any) => {
        if (creating) return;
        setCreating(true);

        try {
            // 1. Check if chat already exists manually (since RPC might not exist)
            const { data: myParticipations, error: myPartError } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', currentUser.id);
                
            if (myPartError) throw myPartError;

            if (myParticipations && myParticipations.length > 0) {
                const myChatIds = myParticipations.map(c => c.chat_id);
                const { data: commonChats, error: commonError } = await supabase
                    .from('chat_participants')
                    .select('chat_id')
                    .eq('user_id', selectedUser.id)
                    .in('chat_id', myChatIds);
                    
                if (commonError) throw commonError;

                if (commonChats && commonChats.length > 0) {
                    // Chat already exists!
                    onChatCreated(commonChats[0].chat_id, selectedUser);
                    onClose();
                    return;
                }
            }

            // 2. Create new chat
            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({ created_by: currentUser.id })
                .select()
                .single();

            if (chatError) throw chatError;

            // 3. Add participants
            const { error: partError } = await supabase
                .from('chat_participants')
                .insert([
                    { chat_id: newChat.id, user_id: currentUser.id },
                    { chat_id: newChat.id, user_id: selectedUser.id }
                ]);

            if (partError) throw partError;

            // Success
            onChatCreated(newChat.id, selectedUser);
            onClose();
        } catch (error: any) {
            alert('فشل إنشاء المحادثة: ' + (error?.message || 'خطأ غير معروف'));
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquarePlus size={20} className="text-primary" />
                        محادثة جديدة
                    </h2>
                    <button 
                        onClick={onClose}
                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-border/50">
                    <div className="relative">
                        <Input
                            placeholder="ابحث عن زميل (الاسم، الإدارة)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-9 rounded-xl"
                            autoFocus
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleStartChat(user)}
                                    disabled={creating}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-right"
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                                        ) : (
                                            <User size={18} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm truncate">{user.full_name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.departments?.name || 'بدون إدارة'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">
                            <User className="mx-auto mb-3 opacity-20" size={32} />
                            <p className="text-sm">لا يوجد مستخدمين متاحين</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
