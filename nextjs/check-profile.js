process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    "https://khndydctcxkfskulmnlf.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobmR5ZGN0Y3hrZnNrdWxtbmxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyMjAzMywiZXhwIjoyMDkyMDk4MDMzfQ.QU8oHK_PXjyZvXgJaJ-q0eQaHiVP9meGmWJAQKMSUkk"
);

async function check() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            role_id ( name ),
            department_id ( name )
        `);

    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(profiles, null, 2));
    }
}

check();
