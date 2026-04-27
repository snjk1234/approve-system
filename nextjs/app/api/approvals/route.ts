import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = supabase as any;

        // Fetch documents created by the user (sent requests)
        const { data: sentDocs, error: sentError } = await db
            .from('documents')
            .select(`
                id,
                request_number,
                title,
                description,
                status,
                file_url,
                file_name,
                created_at,
                updated_at,
                approval_steps (
                    id,
                    sequence,
                    status,
                    comment,
                    acted_at,
                    approver_id
                )
            `)
            .eq('creator_id', user.id)
            .eq('is_archived', false)
            .order('created_at', { ascending: false });

        if (sentError) {
            console.error('Error fetching sent documents:', sentError);
            return NextResponse.json({ error: sentError.message }, { status: 500 });
        }

        // Fetch approval steps assigned to the user
        const { data: mySteps, error: stepsError } = await db
            .from('approval_steps')
            .select(`id, sequence, status, comment, acted_at, document_id`)
            .eq('approver_id', user.id)
            .order('created_at', { ascending: false });

        if (stepsError) {
            console.error('Error fetching approval steps:', stepsError);
            return NextResponse.json({ error: stepsError.message }, { status: 500 });
        }

        // Fetch the documents for steps assigned to the user
        let pendingDocs: any[] = [];
        if (mySteps && mySteps.length > 0) {
            const docIds = Array.from(new Set<string>(mySteps.map((s: any) => s.document_id)));
            const { data: assignedDocs, error: assignedError } = await db
                .from('documents')
                .select(`
                    id,
                    request_number,
                    title,
                    description,
                    status,
                    file_url,
                    file_name,
                    created_at,
                    updated_at,
                    creator_id,
                    approval_steps (
                        id,
                        sequence,
                        status,
                        comment,
                        acted_at,
                        approver_id
                    )
                `)
                .in('id', docIds)
                .eq('is_archived', false);

            if (assignedError) {
                console.error('Error fetching assigned documents:', assignedError);
            } else {
                pendingDocs = assignedDocs || [];
            }
        }

        // Get user profiles for approvers in bulk
        const allApproverIds = new Set<string>();
        [...(sentDocs || []), ...pendingDocs].forEach((doc: any) => {
            doc.approval_steps?.forEach((step: any) => {
                if (step.approver_id) allApproverIds.add(step.approver_id);
            });
        });
        pendingDocs.forEach((doc: any) => {
            if (doc.creator_id) allApproverIds.add(doc.creator_id);
        });

        let profiles: Record<string, any> = {};
        if (allApproverIds.size > 0) {
            const { data: profileData } = await db
                .from('profiles')
                .select('id, full_name, avatar_url, email')
                .in('id', Array.from(allApproverIds));

            profileData?.forEach((p: any) => {
                profiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url, email: p.email };
            });
        }

        return NextResponse.json({
            sent: sentDocs || [],
            pending: pendingDocs,
            mySteps: mySteps || [],
            profiles,
            userId: user.id,
        });
    } catch (error: any) {
        console.error('Unexpected error in GET /api/approvals:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = supabase as any;
        const body = await request.json();
        const { title, description, file_url, file_name, approvers } = body;

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });
        }
        if (!approvers || !Array.isArray(approvers) || approvers.length === 0) {
            return NextResponse.json({ error: 'يجب إضافة معتمد واحد على الأقل' }, { status: 400 });
        }

        // Create the document
        const { data: doc, error: docError } = await db
            .from('documents')
            .insert({
                title: title.trim(),
                description: description?.trim() || null,
                creator_id: user.id,
                file_url: file_url || null,
                file_name: file_name || null,
                status: 'pending',
            })
            .select('id, request_number')
            .single();

        if (docError || !doc) {
            console.error('Error creating document:', docError);
            return NextResponse.json({ error: docError?.message || 'فشل إنشاء الوثيقة' }, { status: 500 });
        }

        // Create approval steps
        const steps = approvers.map((approverId: string, index: number) => ({
            document_id: doc.id,
            approver_id: approverId,
            sequence: index + 1,
            status: index === 0 ? 'pending' : 'waiting',
        }));

        const { error: stepsError } = await db.from('approval_steps').insert(steps);

        if (stepsError) {
            console.error('Error creating approval steps:', stepsError);
            await db.from('documents').delete().eq('id', doc.id);
            return NextResponse.json({ error: stepsError.message }, { status: 500 });
        }

        // Update document status to in_progress
        await db.from('documents').update({ status: 'in_progress' }).eq('id', doc.id);

        // Notify first approver
        const firstApproverId = approvers[0];
        await db.from('notifications').insert({
            user_id: firstApproverId,
            type: 'approval_request',
            title: 'طلب اعتماد جديد',
            body: `لديك طلب اعتماد جديد: ${title.trim()}`,
            link: `/approvals/${doc.id}`,
        });

        return NextResponse.json({
            success: true,
            documentId: doc.id,
            requestNumber: doc.request_number,
        }, { status: 201 });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/approvals:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
