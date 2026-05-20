// Key Backup API endpoint
// Handles server-side storage of client-encrypted key backups

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServiceRoleClient } from '$lib/supabase/service-role.js';
import { extractSupabaseAccessToken } from '$lib/auth/extract-access-token.js';

// Lazy service role client creation
let supabaseServiceRole = null;
function getServiceRoleClient() {
	if (!supabaseServiceRole) {
		supabaseServiceRole = createServiceRoleClient();
	}
	return supabaseServiceRole;
}

// Create regular client for JWT validation
const supabaseClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

/**
 * Authenticate user from request cookies
 * @param {Request} request
 * @returns {Promise<{user?: any, error?: string}>}
 */
async function authenticateUser(request) {
	       try {
		       // Try Authorization header first (used during login before cookies are set)
		       const authHeader = request.headers.get('authorization');
		       if (authHeader?.startsWith('Bearer ')) {
			       const token = authHeader.substring(7);
			       const { data: { user }, error } = await supabaseClient.auth.getUser(token);
			       if (!error && user) {
				       return { user };
			       }
		       }

		       // Fall back to cookies
		       const cookieHeader = request.headers.get('cookie');
		       if (!cookieHeader) {
			       return { error: 'No authentication found' };
		       }

		       const cookies = Object.fromEntries(
			       cookieHeader.split('; ').map(cookie => {
				       const [name, value] = cookie.split('=');
				       return [name, decodeURIComponent(value)];
			       })
		       );

		       // Use dynamic Supabase cookie extraction
		       const { accessToken, cookieKey, log } = extractSupabaseAccessToken(cookies);
		       log.forEach(msg => console.log(msg));

		       if (!accessToken) {
			       return { error: 'No access token found' };
		       }

		       const { data: { user }, error } = await supabaseClient.auth.getUser(accessToken);

		       if (error || !user) {
			       return { error: `Invalid token: ${error?.message}` };
		       }

		       return { user };
	       } catch (error) {
		       return { error: `Authentication error: ${error.message}` };
	       }
}

/**
 * GET /api/auth/key-backup
 * Fetch the authenticated user's encrypted key backup
 */
export async function GET({ request }) {
	try {
		const { user, error: authError } = await authenticateUser(request);
		if (authError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data, error } = await getServiceRoleClient()
			.from('key_backups')
			.select('encrypted_keys, created_at, updated_at')
			.eq('user_id', user.id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				// No rows found
				return json({ backup: null }, { status: 404 });
			}
			console.error('Error fetching key backup:', error);
			return json({ error: 'Failed to fetch key backup' }, { status: 500 });
		}

		return json({
			backup: {
				encrypted_keys: data.encrypted_keys,
				created_at: data.created_at,
				updated_at: data.updated_at
			}
		});

	} catch (error) {
		console.error('Error in GET /api/auth/key-backup:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * PUT /api/auth/key-backup
 * Store or update the authenticated user's encrypted key backup
 */
export async function PUT({ request }) {
	try {
		const { user, error: authError } = await authenticateUser(request);
		if (authError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { encrypted_keys } = await request.json();

		if (!encrypted_keys || typeof encrypted_keys !== 'string') {
			return json({ error: 'Missing or invalid encrypted_keys' }, { status: 400 });
		}

		// Validate that encrypted_keys is valid JSON (it should be the export format)
		try {
			JSON.parse(encrypted_keys);
		} catch {
			return json({ error: 'encrypted_keys must be a valid JSON string' }, { status: 400 });
		}

		// Upsert: insert or update on conflict
		const { data, error } = await getServiceRoleClient()
			.from('key_backups')
			.upsert(
				{
					user_id: user.id,
					encrypted_keys,
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'user_id' }
			)
			.select('id, created_at, updated_at')
			.single();

		if (error) {
			console.error('Error storing key backup:', error);
			return json({ error: 'Failed to store key backup' }, { status: 500 });
		}

		console.log(`🔑 Key backup stored for user ${user.id}`);

		return json({
			success: true,
			backup_id: data.id,
			created_at: data.created_at,
			updated_at: data.updated_at
		});

	} catch (error) {
		console.error('Error in PUT /api/auth/key-backup:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
