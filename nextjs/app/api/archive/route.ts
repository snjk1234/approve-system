import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const status = searchParams.get('status') || 'all'; // all, completed, cancelled, pending

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = supabase as any;

        // 1. Find matching documents directly
        let docsQuery = db.from('documents').select(`
            id,
            request_number,
            title,
            description,
            status,
            file_name,
            created_at,
            profiles:creator_id(full_name)
        `);

        if (status !== 'all') {
            if (status === 'pending') {
                docsQuery = docsQuery.in('status', ['pending', 'in_progress']);
            } else {
                docsQuery = docsQuery.eq('status', status);
            }
        }

        const { data: allDocs, error: docsError } = await docsQuery.order('created_at', { ascending: false });

        if (docsError) throw docsError;

        // 2. Fetch all steps comments to filter in memory (or we could do a separate query)
        // For MVP, we will fetch steps for the retrieved docs to search through comments
        const docIds = (allDocs || []).map((d: any) => d.id);
        
        let stepsMap: Record<string, any[]> = {};
        if (docIds.length > 0) {
            const { data: steps } = await db.from('approval_steps')
                .select('document_id, status, comment, acted_at, profiles:approver_id(full_name)')
                .in('document_id', docIds)
                .order('sequence', { ascending: true });
            
            steps?.forEach((step: any) => {
                if (!stepsMap[step.document_id]) stepsMap[step.document_id] = [];
                stepsMap[step.document_id].push(step);
            });
        }

        // 3. Filter documents based on query (title, description, file_name, or comments)
        let filteredDocs = allDocs || [];
        if (q.trim()) {
            const lowerQ = q.toLowerCase();
            filteredDocs = filteredDocs.filter((doc: any) => {
                const matchTitle = doc.title?.toLowerCase().includes(lowerQ);
                const matchDesc = doc.description?.toLowerCase().includes(lowerQ);
                const matchFile = doc.file_name?.toLowerCase().includes(lowerQ);
                
                const docSteps = stepsMap[doc.id] || [];
                const matchComments = docSteps.some((step: any) => step.comment?.toLowerCase().includes(lowerQ));

                return matchTitle || matchDesc || matchFile || matchComments;
            });
        }

        // Attach steps back to filtered docs for UI preview
        filteredDocs = filteredDocs.map((doc: any) => ({
            ...doc,
            steps: stepsMap[doc.id] || [],
            matchType: q.trim() ? (
                doc.title?.toLowerCase().includes(q.toLowerCase()) ? 'العنوان' :
                doc.file_name?.toLowerCase().includes(q.toLowerCase()) ? 'ملف مرفق' :
                doc.description?.toLowerCase().includes(q.toLowerCase()) ? 'الوصف' : 'تعليق'
            ) : null
        }));

        // 4. Search in Chats (Messages)
        let chatResults: any[] = [];
        if (q.trim()) {
            // Only search messages if there's a query
            const { data: messages } = await db.from('messages')
                .select(`
                    id,
                    content,
                    created_at,
                    profiles!sender_id(full_name),
                    group_id
                `)
                .ilike('content', `%${q}%`)
                .order('created_at', { ascending: false })
                .limit(50);
            
            chatResults = messages || [];
        }

        return NextResponse.json({
            documents: filteredDocs,
            chats: chatResults
        });

    } catch (error: any) {
        console.error('Error in Archive API:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
