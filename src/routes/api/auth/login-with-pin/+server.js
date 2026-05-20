import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

/**
 * Validate phone number format
 * @param {string} phoneNumber
 * @returns {boolean}
 */
function isValidPhoneNumber(phoneNumber) {
	const phoneRegex = /^\+[1-9]\d{1,14}$/;
	return phoneRegex.test(phoneNumber);
}

export async function POST(event) {
	const { request } = event;
	
	try {
		const requestBody = await request.json();
		const { phoneNumber, pin } = requestBody;

		if (!phoneNumber || !pin) {
			return json(
				{ error: 'Phone number and PIN are required' },
				{ status: 400 }
			);
		}

		if (!isValidPhoneNumber(phoneNumber)) {
			return json(
				{ error: 'Invalid phone number format', suggestion: 'Ensure your phone number is in E.164 format (e.g., +1234567890)' },
				{ status: 400 }
			);
		}

		const supabase = createSupabaseServerClient(event);

		// Authenticate with phone and PIN (password)
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
			phone: phoneNumber,
			password: pin
		});

		if (authError) {
			console.error('Login error:', authError);
			let userMessage = 'Invalid phone number or PIN';
			if (authError.message?.includes('Invalid login credentials')) {
				userMessage = 'Incorrect PIN. Please try again.';
			}
			return json(
				{ error: userMessage, code: 'LOGIN_FAILED' },
				{ status: 401 }
			);
		}

		if (!authData.user) {
			return json({ error: 'Login failed - no user data' }, { status: 400 });
		}

		// Get the extended user data from the users table using service role
		const serviceSupabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		
		const { data: user, error: userError } = await serviceSupabase
			.from('users')
			.select('*')
			.eq('auth_user_id', authData.user.id)
			.single();

		if (userError) {
			console.error('Database lookup error:', userError);
			return json({ error: 'Account not fully setup' }, { status: 500 });
		}

		return json({
			success: true,
			user: {
				id: user.id,
				username: user.username,
				displayName: user.display_name,
				phoneNumber: user.phone_number,
				avatarUrl: user.avatar_url,
				createdAt: user.created_at
			},
			session: authData.session,
			message: 'Signed in successfully'
		});

	} catch (error) {
		console.error('Login with PIN exception:', error);
		return json(
			{ error: 'Internal server error', code: 'INTERNAL_ERROR' },
			{ status: 500 }
		);
	}
}
