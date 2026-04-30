'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, User, Users, X, MessageSquarePlus } from 'lucide-react';
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
    
    // Group mode states
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [groupName, setGroupName] = useState('');

    useEffect(() => {
        if (!isOpen || !currentUser) return;

        async function fetchUsers() {
            setLoading(true);
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
        // Reset state on open
        setIsGroupMode(false);
        setSelectedUsers([]);
        setGroupName('');
    }, [isOpen, currentUser]);

    const filteredUsers = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.departments?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUserSelection = (user: any) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const handleCreateChat = async () => {
        if (creating) return;
        
        // Validation
        if (isGroupMode && !groupName.trim()) {
            alert('يرجى إدخال اسم المجموعة');
            return;
        }
        if (selectedUsers.length < 1) {
            alert('يرجى اختيار عضو واحد على الأقل');
            return;
        }

        setCreating(true);

        try {
            if (!isGroupMode && selectedUsers.length === 1) {
                const selectedUser = selectedUsers[0];
                // Check if private chat already exists
                const { data: participations } = await supabase
                    .from('chat_participants')
                    .select('chat_id')
                    .eq('user_id', currentUser.id);
                
                if (participations && participations.length > 0) {
                    const myChatIds = participations.map(c => c.chat_id);
                    const { data: common } = await supabase
                        .from('chat_participants')
                        .select('chat_id')
                        .eq('user_id', selectedUser.id)
                        .in('chat_id', myChatIds);
                    
                    if (common && common.length > 0) {
                        // Check if that common chat is private
                        const { data: chatData } = await supabase
                            .from('chats')
                            .select('type')
                            .eq('id', common[0].chat_id)
                            .single();
                        
                        if (chatData?.type === 'private') {
                            onChatCreated(common[0].chat_id, selectedUser);
                            onClose();
                            return;
                        }
                    }
                }
            }

            // Create new chat
            const chatPayload: any = { created_by: currentUser.id };
            if (isGroupMode) {
                chatPayload.type = 'group';
                chatPayload.name = groupName.trim();
            } else {
                chatPayload.type = 'private';
            }

            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert(chatPayload)
                .select()
                .single();

            if (chatError) throw chatError;

            // Add participants
            const participantEntries = [
                { chat_id: newChat.id, user_id: currentUser.id, role: 'admin' }
            ];
            
            selectedUsers.forEach(u => {
                participantEntries.push({ chat_id: newChat.id, user_id: u.id, role: 'member' });
            });

            const { error: partError } = await supabase
                .from('chat_participants')
                .insert(participantEntries);

            if (partError) throw partError;

            // Success
            onChatCreated(newChat.id, isGroupMode ? { full_name: groupName } : selectedUsers[0]);
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
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquarePlus size={20} className="text-primary" />
                        {isGroupMode ? 'إنشاء مجموعة جديدة' : 'محادثة جديدة'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex p-1 bg-muted m-4 rounded-xl">
                    <button 
                        onClick={() => { setIsGroupMode(false); setSelectedUsers([]); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isGroupMode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                    >
                        محادثة فردية
                    </button>
                    <button 
                        onClick={() => { setIsGroupMode(true); setSelectedUsers([]); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isGroupMode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                    >
                        مجموعة جديدة
                    </button>
                </div>

                {/* Group Details */}
                {isGroupMode && (
                    <div className="px-4 pb-4">
                        <Input
                            placeholder="اسم المجموعة..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="rounded-xl h-11 border-primary/20 focus:border-primary"
                        />
                    </div>
                )}

                {/* Search */}
                <div className="px-4 pb-4">
                    <div className="relative">
                        <Input
                            placeholder="ابحث عن أعضاء..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-9 rounded-xl h-10"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    </div>
                </div>

                {/* Selected Users Chips */}
                {selectedUsers.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {selectedUsers.map(u => (
                            <div key={u.id} className="flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-2 py-1 rounded-full border border-primary/20 animate-in zoom-in-95">
                                <span className="max-w-[80px] truncate">{u.full_name}</span>
                                <button onClick={() => toggleUserSelection(u)} className="hover:text-red-500 transition-colors">
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => {
                                const isSelected = selectedUsers.some(u => u.id === user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => {
                                            if (isGroupMode) {
                                                toggleUserSelection(user);
                                            } else {
                                                setSelectedUsers([user]);
                                            }
                                        }}
                                        disabled={creating}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${isSelected ? 'bg-primary/5 border-primary/10' : 'hover:bg-muted/50 border-transparent'} border`}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden relative">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <User size={18} />
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                                                    <div className="bg-white rounded-full p-0.5">
                                                        <X size={12} className="text-primary rotate-45" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-primary' : ''}`}>{user.full_name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.departments?.name || 'بدون إدارة'}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">
                            <User className="mx-auto mb-3 opacity-20" size={32} />
                            <p className="text-sm">لا يوجد مستخدمين متاحين</p>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-border/50 bg-card">
                    <button
                        onClick={handleCreateChat}
                        disabled={creating || selectedUsers.length === 0}
                        className="w-full bg-primary text-primary-foreground h-11 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        {creating ? (
                            <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
                        ) : (
                            <>
                                <MessageSquarePlus size={18} />
                                {isGroupMode ? 'إنشاء المجموعة' : 'بدء المحادثة'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
