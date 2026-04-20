'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ChatList } from '@/components/app/ChatList';
import { ChatWindow } from '@/components/app/ChatWindow';

export default function ChatPage() {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        }
        getUser();
    }, []);

    const handleSelectChat = (chatId: string, otherUser: any) => {
        setSelectedChatId(chatId);
        setSelectedUser(otherUser);
    };

    return (
        <div className="h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex animate-in fade-in duration-500">
            {/* Left side: Chat List (in RTL, it appears on the right) */}
            <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 h-full">
                <ChatList 
                    onSelectChat={handleSelectChat} 
                    selectedChatId={selectedChatId} 
                />
            </div>

            {/* Right side: Chat Window (in RTL, it appears on the left) */}
            <div className={`flex-1 h-full hidden md:block ${selectedChatId ? 'block' : ''}`}>
                {currentUser ? (
                    <ChatWindow 
                        chatId={selectedChatId || ''} 
                        currentUser={currentUser} 
                        otherUser={selectedUser} 
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
