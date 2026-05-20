// src/lib/auth/extract-access-token.js
// Reusable Supabase Auth cookie extraction for any project ref

/**
 * Extracts the Supabase access token from cookies (dynamic project ref support)
 * @param {Object} cookies - Parsed cookies object
 * @returns {{ accessToken: string|null, cookieKey: string|null, log: string[] }}
 */
export function extractSupabaseAccessToken(cookies) {
	const log = [];
	const authCookieKey = Object.keys(cookies).find(key => key.includes('auth-token'));
	let accessToken = null;

	if (authCookieKey) {
		log.push(`🔑 Detected Supabase auth cookie: ${authCookieKey}`);
		try {
			let tokenData = cookies[authCookieKey];
			if (tokenData.startsWith('base64-')) {
				log.push('🔑 Decoding base64 token data');
				tokenData = Buffer.from(tokenData.substring(7), 'base64').toString('utf-8');
			}
			const parsed = JSON.parse(tokenData);
			accessToken = parsed.access_token;
			log.push('🔑 Successfully extracted access token from Supabase cookie');
		} catch (error) {
			log.push(`🔑 Failed to parse Supabase auth cookie: ${error.message}`);
		}
	} else {
		log.push('🔑 No Supabase auth cookie found');
	}

	// Fallback: session cookie (JWT)
	if (!accessToken && cookies.session) {
		log.push('🔑 Found session cookie, checking if it\'s a JWT');
		const sessionToken = cookies.session;
		if (sessionToken.split('.').length === 3) {
			accessToken = sessionToken;
			log.push('🔑 Using session cookie as access token');
		}
	}

	if (!accessToken) {
		log.push('🔑 No access token found');
	}

	return { accessToken, cookieKey: authCookieKey || null, log };
}
