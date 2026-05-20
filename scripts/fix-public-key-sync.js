#!/usr/bin/env node

/**
 * PUBLIC KEY SYNC FIX
 * 
 * This script fixes the issue where users have encryption keys locally
 * but their public keys are not synced to the database.
 * 
 * Usage: node scripts/fix-public-key-sync.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Database connection
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPublicKeySync() {
    console.log('🔑 FIXING PUBLIC KEY SYNC ISSUE');
    console.log('');
    
    try {
        // Step 1: Check all users and their public key status
        console.log('🔍 Checking all users and their public key status...');
        
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, phone_number, created_at');
        
        if (usersError) {
            console.error('❌ Failed to fetch users:', usersError.message);
            return;
        }
        
        console.log(`📊 Found ${users?.length || 0} users`);
        
        if (!users || users.length === 0) {
            console.log('✅ No users found - nothing to fix');
            return;
        }
        
        // Step 2: Check which users are missing public keys
        const { data: publicKeys, error: keysError } = await supabase
            .from('user_public_keys')
            .select('user_id, key_type, created_at');
        
        if (keysError) {
            console.error('❌ Failed to fetch public keys:', keysError.message);
            return;
        }
        
        console.log(`📊 Found ${publicKeys?.length || 0} public key records`);
        
        // Create a set of user IDs that have public keys
        const usersWithKeys = new Set(publicKeys?.map(k => k.user_id) || []);
        
        // Find users without public keys
        const usersWithoutKeys = users.filter(user => !usersWithKeys.has(user.id));
        
        console.log(`📊 Users without public keys: ${usersWithoutKeys.length}`);
        
        if (usersWithoutKeys.length > 0) {
            console.log('');
            console.log('👥 Users missing public keys:');
            for (const user of usersWithoutKeys) {
                console.log(`   - ${user.username} (${user.id})`);
            }
            console.log('');
            console.log('💡 These users need to:');
            console.log('   1. Log into the app');
            console.log('   2. The app should automatically sync their public keys to the database');
            console.log('   3. Or they can manually trigger key generation in Settings');
        }
        
        // Step 3: Check for orphaned public keys (keys without users)
        const userIds = new Set(users.map(u => u.id));
        const orphanedKeys = publicKeys?.filter(key => !userIds.has(key.user_id)) || [];
        
        if (orphanedKeys.length > 0) {
            console.log(`🧹 Found ${orphanedKeys.length} orphaned public keys (users don't exist)`);
            
            for (const key of orphanedKeys) {
                console.log(`🗑️ Deleting orphaned public key for user ${key.user_id}`);
                
                const { error: deleteError } = await supabase
                    .from('user_public_keys')
                    .delete()
                    .eq('user_id', key.user_id);
                
                if (deleteError) {
                    console.error(`❌ Failed to delete orphaned key:`, deleteError.message);
                } else {
                    console.log(`✅ Deleted orphaned public key`);
                }
            }
        } else {
            console.log('✅ No orphaned public keys found');
        }
        
        // Step 4: Summary
        console.log('');
        console.log('📊 SUMMARY:');
        console.log(`   Total users: ${users.length}`);
        console.log(`   Users with public keys: ${users.length - usersWithoutKeys.length}`);
        console.log(`   Users missing public keys: ${usersWithoutKeys.length}`);
        console.log(`   Orphaned keys cleaned: ${orphanedKeys.length}`);
        
        if (usersWithoutKeys.length === 0) {
            console.log('');
            console.log('✅ ALL USERS HAVE PUBLIC KEYS!');
            console.log('🎯 File uploads should work now.');
        } else {
            console.log('');
            console.log('⚠️  Some users still need to sync their public keys.');
            console.log('💡 They should log in and the app will automatically sync them.');
        }
        
    } catch (error) {
        console.error('💥 Public key sync fix failed:', error);
        process.exit(1);
    }
}

// Execute the fix
fixPublicKeySync();
