/**
 * @fileoverview Authentication store for managing user state and auth operations
 * Handles login, logout, and user session management
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { createSupabaseClient } from '$lib/supabase.js';
import { messages } from './messages.js';
import { keyManager } from '$lib/crypto/key-manager.js';
import { keySyncService } from '$lib/crypto/key-sync-service.js';

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} displayName
 * @property {string} phoneNumber
 * @property {string|null} avatarUrl
 * @property {string} createdAt
 */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user
 * @property {boolean} loading
 */

// Create writable stores
const authState = writable(/** @type {AuthState} */ ({
	user: null,
	loading: true
}));

/**
 * Auth store with methods for authentication operations
 */
function createAuthStore() {
	const { subscribe, set, update } = authState;

	return {
		subscribe,
		
		/**
		 * Initialize auth state from localStorage and restore Supabase session
		 */
		async init() {
			if (!browser) return;
			
			update(state => ({ ...state, loading: true }));
			
			try {
				const storedUser = localStorage.getItem('app_user');
				const storedSession = localStorage.getItem('app_session');
				
				if (storedUser && storedSession) {
					const user = JSON.parse(storedUser);
					const session = JSON.parse(storedSession);
					
					// Check if session is still valid (not expired)
					if (session.access_token && session.expires_at) {
						const expiresAt = new Date(session.expires_at * 1000);
						const now = new Date();
						
						if (expiresAt > now) {
							// Session is still valid, restore user
							update(state => ({ ...state, user, loading: false }));
							
							// Schedule key sync for existing users (non-blocking)
							setTimeout(async () => {
								try {
									console.log('🔑 Auto-syncing public keys for restored session...');
									const syncResult = await keySyncService.autoSyncOnLogin();
									if (syncResult.success) {
										console.log('🔑 ✅ Public keys synced successfully for restored session');
									} else {
										console.warn('🔑 ⚠️ Public key sync failed for restored session:', syncResult.error);
									}
								} catch (syncError) {
									console.error('🔑 ❌ Error during session restore key sync:', syncError);
								}
							}, 100);
							
							return;
						} else if (session.refresh_token) {
							// Token is expired but we have a refresh token, try to refresh
							console.log('Access token expired, attempting to refresh...');
							const refreshResult = await this.refreshSession(session.refresh_token);
							if (refreshResult.success) {
								// Successfully refreshed, restore user with new session
								update(state => ({ ...state, user, loading: false }));
								
								// Schedule key sync after session refresh (non-blocking)
								setTimeout(async () => {
									try {
										console.log('🔑 Auto-syncing public keys after session refresh...');
										const syncResult = await keySyncService.autoSyncOnLogin();
										if (syncResult.success) {
											console.log('🔑 ✅ Public keys synced successfully after session refresh');
										} else {
											console.warn('🔑 ⚠️ Public key sync failed after session refresh:', syncResult.error);
										}
									} catch (syncError) {
										console.error('🔑 ❌ Error during session refresh key sync:', syncError);
									}
								}, 100);
								
								return;
							}
							// Refresh failed, fall through to clear session
						}
					}
					
					// Session is expired or invalid, clear stored data
					console.log('Session expired and cannot be refreshed, clearing stored data');
					localStorage.removeItem('app_user');
					localStorage.removeItem('app_session');
				}
				
				update(state => ({ ...state, loading: false }));
			} catch (error) {
				console.error('Failed to load user from localStorage:', error);
				// Clear potentially corrupted data
				localStorage.removeItem('app_user');
				localStorage.removeItem('app_session');
			} finally {
				update(state => ({ ...state, loading: false }));
			}
		},

		/**
		 * Refresh the session using refresh token
		 * @param {string} refreshToken
		 * @returns {Promise<{success: boolean, session?: any, error?: string}>}
		 */
		async refreshSession(refreshToken) {
			try {
				const supabase = createSupabaseClient();
				const { data, error } = await supabase.auth.refreshSession({
					refresh_token: refreshToken
				});

				if (error || !data.session) {
					console.error('Failed to refresh session:', error);
					return { success: false, error: error?.message || 'Failed to refresh session' };
				}

				// Store the new session
				if (browser) {
					localStorage.setItem('app_session', JSON.stringify(data.session));
				}

				console.log('Session refreshed successfully');
				return { success: true, session: data.session };
			} catch (error) {
				console.error('Session refresh error:', error);
				return { success: false, error: 'Failed to refresh session' };
			}
		},

		/**
		 * Get current valid session, refreshing if necessary
		 * @returns {Promise<{session?: any, error?: string}>}
		 */
		async getCurrentSession() {
			if (!browser) return { error: 'Not in browser environment' };

			try {
				const storedSession = localStorage.getItem('app_session');
				if (!storedSession) {
					return { error: 'No session found' };
				}

				const session = JSON.parse(storedSession);
				
				// Check if session is still valid
				if (session.access_token && session.expires_at) {
					const expiresAt = new Date(session.expires_at * 1000);
					const now = new Date();
					
					if (expiresAt > now) {
						// Session is still valid
						return { session };
					} else if (session.refresh_token) {
						// Token is expired, try to refresh
						const refreshResult = await this.refreshSession(session.refresh_token);
						if (refreshResult.success) {
							return { session: refreshResult.session };
						}
						return { error: 'Session expired and refresh failed' };
					}
				}
				
				return { error: 'Session expired' };
			} catch (error) {
				console.error('Failed to get current session:', error);
				return { error: 'Failed to get session' };
			}
		},

		/**
		 * Send SMS verification code using server-side API
		 * @param {string} phoneNumber - Phone number in E.164 format
		 * @returns {Promise<{success: boolean, error?: string}>}
		 */
		async sendSMS(phoneNumber) {
			update(state => ({ ...state, loading: true }));
			messages.clear(); // Clear any existing messages

			try {
				/** @type {Record<string, string>} */
				const headers = {
					'Content-Type': 'application/json'
				};

				// Add Authorization header if we have a session
				const sessionResult = await this.getCurrentSession();
				if (sessionResult.session && sessionResult.session.access_token) {
					headers['Authorization'] = `Bearer ${sessionResult.session.access_token}`;
				}

				const response = await fetch('/api/auth/send-sms', {
					method: 'POST',
					headers,
					body: JSON.stringify({ phoneNumber })
				});

				const data = await response.json();

				if (!response.ok) {
					const errorMessage = data.error || 'Failed to send SMS';
					messages.error(errorMessage);
					update(state => ({ ...state, loading: false }));
					return { success: false, error: errorMessage };
				}

				const successMessage = data.message || 'Verification code sent successfully!';
				messages.success(successMessage);
				update(state => ({ ...state, loading: false }));
				return { success: true };

			} catch (error) {
				const errorMessage = 'Failed to send SMS. Please try again.';
				messages.error(errorMessage);
				update(state => ({ ...state, loading: false }));
				return { success: false, error: errorMessage };
			}
		},

		/**
		 * Verify SMS code and login/register user
		 * @param {string} phoneNumber - Phone number in E.164 format
		 * @param {string} verificationCode - 6-digit verification code
		 * @param {string} [username] - Username for new users (only needed for profile completion)
		 * @param {string} [displayName] - Display name for new users (only needed for profile completion)
		 * @returns {Promise<{success: boolean, error?: string, user?: User, isNewUser?: boolean, requiresUsername?: boolean, session?: any, message?: string}>}
		 */
		async verifySMS(phoneNumber, verificationCode, username, displayName) {
			update(state => ({ ...state, loading: true }));
			messages.clear(); // Clear any existing messages

			try {
				/** @type {Record<string, string>} */
				const headers = {
					'Content-Type': 'application/json'
				};

				// Add Authorization header if we have a session (for profile completion)
				const sessionResult = await this.getCurrentSession();
				if (sessionResult.session && sessionResult.session.access_token) {
					headers['Authorization'] = `Bearer ${sessionResult.session.access_token}`;
				}
				
				// Check if we should use session-based request (only when we have both session and username)
				const useSession = !!(sessionResult.session && username);

				// Build request body - only include username/displayName if they're provided
				/** @type {any} */
				const requestBody = {
					phoneNumber,
					verificationCode
				};

				// Only add username/displayName for profile completion (when useSession is true)
				if (useSession) {
					requestBody.username = username;
					requestBody.displayName = displayName;
					requestBody.useSession = true;
				}

				const response = await fetch('/api/auth/verify-sms', {
					method: 'POST',
					headers,
					body: JSON.stringify(requestBody)
				});

				const data = await response.json();

				// Handle special case where username is required
				if (data.requiresUsername) {
					// Store the session for profile completion
					if (browser && data.session) {
						localStorage.setItem('app_session', JSON.stringify(data.session));
					}
					update(state => ({ ...state, loading: false }));
					return {
						success: false,
						requiresUsername: true,
						session: data.session,
						message: data.message
					};
				}

				if (!response.ok) {
					const errorMessage = data.error || 'Failed to verify code';
					messages.error(errorMessage);
					update(state => ({ ...state, loading: false }));
					return {
						success: false,
						error: errorMessage,
						session: data.session // Keep session for retry if available
					};
				}

				// Store user data and session
				const user = data.user;
				const session = data.session;
				
				if (browser) {
					localStorage.setItem('app_user', JSON.stringify(user));
					// Store the session with proper key
					if (session) {
						localStorage.setItem('app_session', JSON.stringify(session));
					}
				}

				if (data.isNewUser) {
					messages.success('Account created successfully! Welcome to SecureConnect Enterprise Chat!');
				} else {
					messages.success('Welcome back!');
				}

				update(state => ({ ...state, user, loading: false }));
				
				// Auto-sync keys for all users (new and existing) if they have local keys
				// This is non-blocking and only syncs if keys exist locally
				setTimeout(async () => {
					try {
						console.log('🔑 Checking if key sync is needed...');
						const syncResult = await keySyncService.autoSyncOnLogin();
						if (syncResult.success) {
							console.log('🔑 ✅ Public keys synced successfully');
						} else {
							console.warn('🔑 ⚠️ Public key sync skipped or failed:', syncResult.error);
						}
					} catch (syncError) {
						console.error('🔑 ❌ Error during key sync:', syncError);
					}
				}, 100);
				
				return { success: true, user, isNewUser: data.isNewUser, session };

			} catch (error) {
				const errorMessage = 'Failed to verify code. Please try again.';
				messages.error(errorMessage);
				update(state => ({ ...state, loading: false }));
				return { success: false, error: errorMessage };
			}
		},


		/**
		 * Login using phone and PIN directly
		 * @param {string} phoneNumber - Phone number in E.164 format
		 * @param {string} pin - The user's PIN
		 * @returns {Promise<{success: boolean, error?: string, user?: User, session?: any}>}
		 */
		async loginWithPin(phoneNumber, pin) {
			update(state => ({ ...state, loading: true }));
			messages.clear();

			try {
				const response = await fetch('/api/auth/login-with-pin', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ phoneNumber, pin })
				});

				const data = await response.json();

				if (!response.ok) {
					const errorMessage = data.error || 'Failed to login';
					messages.error(errorMessage);
					update(state => ({ ...state, loading: false }));
					return { success: false, error: errorMessage };
				}

				const user = data.user;
				const session = data.session;
				
				if (browser) {
					localStorage.setItem('app_user', JSON.stringify(user));
					if (session) {
						localStorage.setItem('app_session', JSON.stringify(session));
					}
				}

				messages.success('Welcome back!');
				update(state => ({ ...state, user, loading: false }));
				
				setTimeout(async () => {
					try {
						await keySyncService.autoSyncOnLogin();
					} catch (e) {
						console.error('Key sync failed:', e);
					}
				}, 100);
				
				return { success: true, user, session };
			} catch (error) {
				const errorMessage = 'An error occurred during login. Please try again.';
				messages.error(errorMessage);
				update(state => ({ ...state, loading: false }));
				return { success: false, error: errorMessage };
			}
		},

		/**
		 * Logout user
		 */
		async logout() {
			update(state => ({ ...state, loading: true }));

			try {
				// Clear Supabase session if exists
				if (browser) {
					const supabase = createSupabaseClient();
					await supabase.auth.signOut();
				}
			} catch (error) {
				console.error('Supabase logout error:', error);
			}

			// Clear local storage and state
			if (browser) {
				localStorage.removeItem('app_user');
				localStorage.removeItem('app_session');
			}

			set({ user: null, loading: false });
		},

		/**
		 * Clear messages
		 */
		clearMessages() {
			messages.clear();
		},

		/**
		 * Update user profile
		 * @param {Partial<User>} updates
		 */
		updateUser(updates) {
			update(state => {
				if (!state.user) return state;
				
				const updatedUser = { ...state.user, ...updates };
				
				if (browser) {
					localStorage.setItem('app_user', JSON.stringify(updatedUser));
				}
				
				return { ...state, user: updatedUser };
			});
		}
	};
}

// Export the auth store
export const auth = createAuthStore();

// Derived stores for convenience
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.loading);

// Initialize auth on module load
if (browser) {
	auth.init();
}
