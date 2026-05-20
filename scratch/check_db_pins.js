import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'https://sxhqowwmmdsxbowyewou.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkPins() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
        return;
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('--- Checking Users Table for Backup PINs ---');
    const { data: users, error } = await supabase
        .from('users')
        .select('username, auth_user_id, backup_pin_hash')
        .limit(10);

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.table(users.map(u => ({
            username: u.username,
            has_pin_hash: !!u.backup_pin_hash,
            hash_preview: u.backup_pin_hash ? u.backup_pin_hash.substring(0, 10) + '...' : 'none'
        })));
    }
}

checkPins();
