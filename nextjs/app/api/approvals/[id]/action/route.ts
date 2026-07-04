import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

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

        if (!action || !['approve', 'reject', 'request_changes'].includes(action)) {
            return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400 });
        }

        // Find the current user's pending step on this document
        const { data: step, error: stepError } = await db
            .from('approval_steps')
            .select('id, sequence, status, document_id, comment')
            .eq('document_id', id)
            .eq('approver_id', user.id)
            .eq('status', 'pending')
            .single();

        if (stepError || !step) {
            return NextResponse.json({ error: 'لا يوجد لديك خطوة مراسلة معلقة لهذه الوثيقة' }, { status: 403 });
        }

        const appendComment = async (userId: string, act: string, text: string) => {
            const { data: profile } = await db
                .from('profiles')
                .select('full_name')
                .eq('id', userId)
                .single();
            const userName = profile?.full_name || 'مستخدم';

            let commentList: any[] = [];
            const currentComment = step.comment;
            if (currentComment) {
                try {
                    const parsed = JSON.parse(currentComment);
                    if (Array.isArray(parsed)) {
                        commentList = parsed;
                    } else {
                        commentList = [{
                            user_id: step.approver_id || userId,
                            user_name: 'معتمد',
                            action: 'تعليق سابق',
                            comment: currentComment,
                            created_at: new Date().toISOString()
                        }];
                    }
                } catch (e) {
                    commentList = [{
                        user_id: step.approver_id || userId,
                        user_name: 'معتمد',
                        action: 'تعليق سابق',
                        comment: currentComment,
                        created_at: new Date().toISOString()
                    }];
                }
            }

            let actionLabel = 'موافقة';
            if (act === 'reject') actionLabel = 'رفض';
            else if (act === 'request_changes') actionLabel = 'طلب تعديل';
            else if (act === 'resubmit') actionLabel = 'استكمال';

            commentList.push({
                user_id: userId,
                user_name: userName,
                action: actionLabel,
                comment: text,
                created_at: new Date().toISOString()
            });

            return JSON.stringify(commentList);
        }

        if (action === 'request_changes') {
            const updatedCommentJson = await appendComment(user.id, 'request_changes', comment?.trim() || 'مطلوب تعديل المراسلة');

            // Request changes: update step comment, set document status to paused
            const { error: updateStepError } = await db
                .from('approval_steps')
                .update({
                    comment: updatedCommentJson,
                    acted_at: new Date().toISOString(),
                })
                .eq('id', step.id);

            if (updateStepError) {
                return NextResponse.json({ error: updateStepError.message }, { status: 500 });
            }

            await db.from('documents').update({ status: 'paused' }).eq('id', id);

            const { data: doc } = await db
                .from('documents')
                .select('creator_id, title')
                .eq('id', id)
                .single();

            // Fetch active user's profile to display their name in notification
            const { data: profile } = await db
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            const approverName = profile?.full_name || user.email;

            const adminDb = createAdminClient();
            if (doc) {
                await adminDb.from('notifications').insert({
                    user_id: doc.creator_id,
                    type: 'approval_request',
                    title: 'طلب تعديل على المراسلة',
                    body: `طلب ${approverName} تعديل على المراسلة: ${doc.title}. الملاحظة: ${comment?.trim() || 'يرجى مراجعة الطلب'}`,
                    link: `/approvals/${id}`,
                });
            }

            return NextResponse.json({ success: true });
        }

        const newStepStatus = action === 'approve' ? 'approved' : 'rejected';
        const updatedCommentJson = await appendComment(user.id, action, comment?.trim() || (action === 'approve' ? 'موافق' : 'مرفوض'));

        // Update the step
        const { error: updateStepError } = await db
            .from('approval_steps')
            .update({
                status: newStepStatus,
                comment: updatedCommentJson,
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

            const adminDb = createAdminClient();
            if (doc) {
                await adminDb.from('notifications').insert({
                    user_id: doc.creator_id,
                    type: 'rejected',
                    title: 'تم رفض طلب المراسلة',
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

                const adminDb = createAdminClient();
                await adminDb.from('notifications').insert({
                    user_id: nextStep.approver_id,
                    type: 'approval_request',
                    title: 'طلب مراسلة يحتاج موافقتك',
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

                const adminDb = createAdminClient();
                if (doc) {
                    await adminDb.from('notifications').insert({
                        user_id: doc.creator_id,
                        type: 'completed',
                        title: 'اكتملت المراسلة',
                        body: `تمت الموافقة على طلبك: ${doc.title}`,
                        link: `/approvals/${id}`,
                    });
                }
            }
        }
        // Mark all unread notifications for this user about this document as read
        const adminDbForMark = createAdminClient();
        await adminDbForMark
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .like('link', `%/${id}`);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Unexpected error in POST /api/approvals/[id]/action:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
