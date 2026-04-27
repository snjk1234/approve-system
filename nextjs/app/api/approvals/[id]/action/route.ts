import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = supabase as any;
        const body = await request.json();
        const { action, comment } = body; // action: 'approve' | 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });
        }

        // Find the current user's pending step on this document
        const { data: step, error: stepError } = await db
            .from('approval_steps')
            .select('id, sequence, status, document_id')
            .eq('document_id', id)
            .eq('approver_id', user.id)
            .eq('status', 'pending')
            .single();

        if (stepError || !step) {
            return NextResponse.json({ error: 'لا يوجد لديك خطوة اعتماد معلقة لهذه الوثيقة' }, { status: 403 });
        }

        const newStepStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update the step
        const { error: updateStepError } = await db
            .from('approval_steps')
            .update({
                status: newStepStatus,
                comment: comment?.trim() || null,
                acted_at: new Date().toISOString(),
            })
            .eq('id', step.id);

        if (updateStepError) {
            return NextResponse.json({ error: updateStepError.message }, { status: 500 });
        }

        if (action === 'reject') {
            // Reject → mark document as cancelled and notify creator
            const { data: doc } = await db
                .from('documents')
                .select('creator_id, title')
                .eq('id', id)
                .single();

            await db.from('documents').update({ status: 'cancelled' }).eq('id', id);

            if (doc) {
                await db.from('notifications').insert({
                    user_id: doc.creator_id,
                    type: 'rejected',
                    title: 'تم رفض طلب الاعتماد',
                    body: `تم رفض طلبك: ${doc.title}`,
                    link: `/approvals/${id}`,
                });
            }
        } else {
            // Approve → check if there's a next step
            const { data: nextStep } = await db
                .from('approval_steps')
                .select('id, approver_id, sequence')
                .eq('document_id', id)
                .eq('sequence', step.sequence + 1)
                .single();

            if (nextStep) {
                // Activate next step
                await db.from('approval_steps').update({ status: 'pending' }).eq('id', nextStep.id);

                // Notify next approver
                const { data: doc } = await db
                    .from('documents')
                    .select('title')
                    .eq('id', id)
                    .single();

                await db.from('notifications').insert({
                    user_id: nextStep.approver_id,
                    type: 'approval_request',
                    title: 'طلب اعتماد يحتاج موافقتك',
                    body: `يحتاج الطلب "${doc?.title}" موافقتك`,
                    link: `/approvals/${id}`,
                });
            } else {
                // All steps approved → complete the document
                const { data: doc } = await db
                    .from('documents')
                    .select('creator_id, title')
                    .eq('id', id)
                    .single();

                await db.from('documents').update({ status: 'completed' }).eq('id', id);

                if (doc) {
                    await db.from('notifications').insert({
                        user_id: doc.creator_id,
                        type: 'completed',
                        title: 'اكتمل الاعتماد',
                        body: `تمت الموافقة على طلبك: ${doc.title}`,
                        link: `/approvals/${id}`,
                    });
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/approvals/[id]/action:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
