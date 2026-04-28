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

        // Check if user is admin
        const { data: profile } = await db
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        // Fetch Stats
        const { count: usersCount } = await db.from('profiles').select('*', { count: 'exact', head: true });
        const { count: docsCount } = await db.from('documents').select('*', { count: 'exact', head: true });
        const { count: pendingDocsCount } = await db.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
        const { count: completedDocsCount } = await db.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'completed');

        // Fetch Users with Roles and Departments
        const { data: usersList } = await db
            .from('profiles')
            .select(`
                id,
                full_name,
                email,
                is_admin,
                created_at,
                roles ( name ),
                departments ( name )
            `)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            stats: {
                totalUsers: usersCount || 0,
                totalDocs: docsCount || 0,
                pendingDocs: pendingDocsCount || 0,
                completedDocs: completedDocsCount || 0,
            },
            users: usersList || []
        });

    } catch (error: any) {
        console.error('Error in Admin API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
