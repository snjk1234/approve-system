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

        // Fetch all profiles with their role name
        // Table is 'profiles' (renamed from 'users' in migration 003)
        // Column is 'role_id' (FK to roles table, changed in migration 006)
        const { data: profiles, error } = await db
            .from('profiles')
            .select(`
                id,
                full_name,
                avatar_url,
                email,
                department_id,
                roles ( id, name )
            `)
            .neq('id', user.id);

        if (error) {
            console.error('[/api/approvals/users] DB error:', JSON.stringify(error));
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Normalize and sort
        const users = (profiles || [])
            .map((p: any) => ({
                id: p.id,
                full_name: p.full_name || null,
                avatar_url: p.avatar_url || null,
                email: p.email || null,
                department_id: p.department_id || null,
                role: p.roles?.name || null,
            }))
            .sort((a: any, b: any) => {
                const nameA = (a.full_name || a.email || '').toLowerCase();
                const nameB = (b.full_name || b.email || '').toLowerCase();
                return nameA.localeCompare(nameB, 'ar');
            });

        return NextResponse.json({ users });

    } catch (error: any) {
        console.error('[/api/approvals/users] Unexpected error:', error?.message ?? error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
