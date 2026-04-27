import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = supabase as any;

        // Fetch the document (RLS will enforce access)
        const { data: doc, error: docError } = await db
            .from('documents')
            .select(`
                id,
                request_number,
                title,
                description,
                status,
                file_url,
                file_name,
                creator_id,
                created_at,
                updated_at,
                approval_steps (
                    id,
                    sequence,
                    status,
                    comment,
                    acted_at,
                    approver_id,
                    created_at
                )
            `)
            .eq('id', id)
            .single();

        if (docError || !doc) {
            return NextResponse.json({ error: 'الوثيقة غير موجودة أو لا تملك صلاحية الوصول' }, { status: 404 });
        }

        // Sort steps by sequence
        if (doc.approval_steps) {
            doc.approval_steps.sort((a: any, b: any) => a.sequence - b.sequence);
        }

        // Collect user IDs to fetch profiles
        const userIds = new Set<string>([doc.creator_id]);
        doc.approval_steps?.forEach((s: any) => {
            if (s.approver_id) userIds.add(s.approver_id);
        });

        const { data: profileData } = await db
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', Array.from(userIds));

        const profiles: Record<string, any> = {};
        profileData?.forEach((p: any) => { profiles[p.id] = p; });

        return NextResponse.json({ document: doc, profiles, userId: user.id });

    } catch (error: any) {
        console.error('Unexpected error in GET /api/approvals/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
