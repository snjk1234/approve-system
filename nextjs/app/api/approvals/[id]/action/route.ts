import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { stepId, action, comment } = await request.json();

    // 1. Verify the step belongs to this user and is pending
    const { data: step, error: stepError } = await supabase
      .from('approval_steps')
      .select('*, document:documents(*)')
      .eq('id', stepId)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: 'Invalid step or unauthorized' }, { status: 403 });
    }

    // 2. Update the step
    const { error: updateStepError } = await supabase
      .from('approval_steps')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        comment,
        acted_at: new Date().toISOString()
      })
      .eq('id', stepId);

    if (updateStepError) throw updateStepError;

    if (action === 'approve') {
      // Find the next step in sequence
      const { data: nextStep, error: nextStepError } = await supabase
        .from('approval_steps')
        .select('*')
        .eq('document_id', id)
        .eq('sequence', step.sequence + 1)
        .single();

      if (nextStep) {
        // Activate next step
        await supabase
          .from('approval_steps')
          .update({ status: 'pending' })
          .eq('id', nextStep.id);

        // Notify next approver
        await supabase.from('notifications').insert({
          user_id: nextStep.approver_id,
          type: 'approval_request',
          title: 'طلب اعتماد بانتظار قرارك',
          body: `مطلوب موافقتك على: ${step.document.title}`,
          link: `/approvals/${id}`
        });
      } else {
        // No more steps - Mark document as completed
        await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', id);

        // Notify creator
        await supabase.from('notifications').insert({
          user_id: step.document.creator_id,
          type: 'completed',
          title: 'تم اعتماد طلبك بالكامل',
          body: `تمت الموافقة النهائية على: ${step.document.title}`,
          link: `/approvals/${id}`
        });
      }
    } else {
      // Action is REJECT
      await supabase
        .from('documents')
        .update({ status: 'cancelled' })
        .eq('id', id);

      // Notify creator
      await supabase.from('notifications').insert({
        user_id: step.document.creator_id,
        type: 'rejected',
        title: 'تم رفض طلب الاعتماد',
        body: `تم رفض طلبك: ${step.document.title}. السبب: ${comment || 'لا يوجد'}`,
        link: `/approvals/${id}`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Action API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
