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
        const { comment } = body;

        // Fetch the document
        const { data: doc, error: docError } = await db
            .from('documents')
            .select('id, title, creator_id, status')
            .eq('id', id)
            .single();

        if (docError || !doc) {
            return NextResponse.json({ error: 'الوثيقة غير موجودة' }, { status: 404 });
        }

        // Verify the user is the creator
        if (doc.creator_id !== user.id) {
            return NextResponse.json({ error: 'ليس لديك صلاحية لتعديل هذه الوثيقة' }, { status: 403 });
        }

        // Verify status is paused
        if (doc.status !== 'paused') {
            return NextResponse.json({ error: 'الوثيقة ليست في حالة طلب تعديل' }, { status: 400 });
        }

        const updatedTitle = doc.title.includes('(معدل)') ? doc.title : `${doc.title} (معدل)`;
        const updatePayload: any = {
            status: 'in_progress',
            title: updatedTitle,
            updated_at: new Date().toISOString()
        };
        if (body.file_url !== undefined) {
            updatePayload.file_url = body.file_url;
        }
        if (body.file_name !== undefined) {
            updatePayload.file_name = body.file_name;
        }

        // Update document status to in_progress
        const { error: updateDocError } = await db
            .from('documents')
            .update(updatePayload)
            .eq('id', id);

        if (updateDocError) {
            return NextResponse.json({ error: updateDocError.message }, { status: 500 });
        }

        // Find the current pending step to notify the approver
        const { data: step } = await db
            .from('approval_steps')
            .select('id, approver_id, comment')
            .eq('document_id', id)
            .eq('status', 'pending')
            .single();

        if (step) {
            // Fetch creator's name
            const { data: profile } = await db
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            const creatorName = profile?.full_name || user.email;

            let commentList: any[] = [];
            const currentComment = step.comment;
            if (currentComment) {
                try {
                    const parsed = JSON.parse(currentComment);
                    if (Array.isArray(parsed)) {
                        commentList = parsed;
                    } else {
                        commentList = [{
                            user_id: step.approver_id,
                            user_name: 'معتمد',
                            action: 'تعليق سابق',
                            comment: currentComment,
                            created_at: new Date().toISOString()
                        }];
                    }
                } catch (e) {
                    commentList = [{
                        user_id: step.approver_id,
                        user_name: 'معتمد',
                        action: 'تعليق سابق',
                        comment: currentComment,
                        created_at: new Date().toISOString()
                    }];
                }
            }

            commentList.push({
                user_id: user.id,
                user_name: creatorName,
                action: 'استكمال المراسلة',
                comment: comment?.trim() || 'تم تعديل المطلوب واستكمال المراسلة',
                created_at: new Date().toISOString()
            });

            // Reset acted_at and save comment
            await db
                .from('approval_steps')
                .update({
                    acted_at: null,
                    comment: JSON.stringify(commentList)
                })
                .eq('id', step.id);

            const adminDb = createAdminClient();
            await adminDb.from('notifications').insert({
                user_id: step.approver_id,
                type: 'approval_request',
                title: 'تم تعديل واستكمال المراسلة',
                body: `قام ${creatorName} بتعديل المراسلة "${doc.title}" واستكمالها للمراجعة. التعليق: ${comment?.trim() || 'تم التعديل'}`,
                link: `/approvals/${id}`,
            });
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
        console.error('Unexpected error in POST /api/approvals/[id]/resubmit:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
