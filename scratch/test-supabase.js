
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
    console.log('Testing Supabase connection...');
    console.log('URL:', PUBLIC_SUPABASE_URL);
    
    if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing environment variables!');
        return;
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log('Fetching users...');
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error('Error listing users:', error);
        } else {
            console.log('Successfully connected! User count:', data.users.length);
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

test();
