import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, file_url, file_name, approver_ids } = body;

    if (!title || !approver_ids || approver_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create document
    console.log('Step 1: Creating document...');
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title,
        description,
        file_url,
        file_name,
        creator_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (docError) {
      console.error('Document Creation Error:', docError);
      throw docError;
    }
    console.log('Document created successfully:', document.id);

    // 2. Create approval steps
    console.log('Step 2: Creating approval steps...');
    const steps = approver_ids.map((approver_id: string, index: number) => ({
      document_id: document.id,
      approver_id: approver_id,
      sequence: index + 1,
      status: index === 0 ? 'pending' : 'waiting'
    }));

    const { error: stepsError } = await supabase
      .from('approval_steps')
      .insert(steps);

    if (stepsError) {
      console.error('Steps Creation Error:', stepsError);
      throw stepsError;
    }
    console.log('Steps created successfully');

    // 3. Create notification for the first approver
    console.log('Step 3: Creating notification...');
    const firstApproverId = approver_ids[0];
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: firstApproverId,
        type: 'approval_request',
        title: 'طلب اعتماد جديد بانتظارك',
        body: `قام ${user.user_metadata?.full_name || user.email} بطلب اعتماد لـ: ${title}`,
        link: `/approvals/${document.id}`
      });

    if (notifError) {
      console.warn('Notification error (non-fatal):', notifError);
      // لا نريد أن يتوقف الطلب إذا فشل الإشعار فقط
    } else {
      console.log('Notification created successfully');
    }

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error: any) {
    console.error('API Detailed Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.details || null,
      code: error.code || null
    }, { status: 500 });
  }
}
