<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { auth, isAuthenticated, isLoading } from '$lib/stores/auth.js';
	import { messages } from '$lib/stores/messages.js';
	import { t } from '$lib/stores/i18n.js';
	import { currentTheme, themeUtils } from '$lib/stores/theme.js';
	import Message from '$lib/components/Message.svelte';
	import { privateKeyManager } from '$lib/crypto/private-key-manager.js';
	import { indexedDBManager } from '$lib/crypto/indexed-db-manager.js';

	let phoneNumber = $state('');
	let pin = $state('');
	let showPin = $state(false);
	let isSubmitting = $state(false);

	// Redirect if already authenticated
	onMount(() => {
		if ($isAuthenticated) {
			goto('/chat');
		}

		// Ensure theme is applied
		if (browser) {
			themeUtils.applyTheme($currentTheme);
		}
		
		const firstInput = document.querySelector('input');
		if (firstInput) firstInput.focus();
	});

	/**
	 * Format phone number as user types
	 * @param {string} value
	 */
	function formatPhoneNumber(value) {
		const cleanValue = value.replace(/[^\d+]/g, '');
		if (cleanValue.length > 0 && !cleanValue.startsWith('+')) {
			return '+' + cleanValue;
		}
		return cleanValue;
	}

	function handlePhoneInput(event) {
		const input = /** @type {HTMLInputElement} */ (event.target);
		phoneNumber = formatPhoneNumber(input.value);
	}

	async function handleLogin() {
		if (!phoneNumber.trim() || !pin.trim()) {
			messages.error('Please enter both your phone number and PIN.');
			return;
		}

		isSubmitting = true;
		try {
			// First authenticate with Supabase Auth
			const loginResult = await auth.loginWithPin(phoneNumber, pin);
			
			if (loginResult.success) {
				try {
					// After successful login, try to decrypt local keys or fetch from backup
					const hasLocalKeys = await indexedDBManager.get('SecureConnect_pq_keypair');
					
					if (!hasLocalKeys) {
						// We need to restore keys from server since they're not on this device
						await privateKeyManager.restoreKeysFromServer(pin);
						messages.success('Encryption keys restored successfully!');
					}
					
					goto('/chat');
				} catch (error) {
					console.error('Key restoration failed:', error);
					// If key restore fails, they are still logged into Supabase Auth.
					// They will be prompted in the chat view to restore keys via Settings.
					messages.warning('Logged in, but failed to restore encryption keys. You can try again in Settings.');
					goto('/chat');
				}
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Login - SecureConnect Enterprise Chat</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<!-- Header -->
		<div class="auth-header">
			<div class="logo">
				<div class="logo-icon">🔐</div>
				<h1>SecureConnect Enterprise Chat</h1>
			</div>
			<p class="subtitle">Welcome back to secure messaging</p>
		</div>

		<!-- Messages -->
		<div class="messages-container">
			{#each $messages as message (message.id)}
				<Message
					type={message.type}
					message={message.message}
					title={message.title}
					dismissible={message.dismissible}
					autoDismiss={message.autoDismiss}
					on:dismiss={() => messages.remove(message.id)}
				/>
			{/each}
		</div>

		<div class="auth-step">
			<h2>Login</h2>
			<p class="step-description">Enter your phone number and backup PIN to log in directly.</p>

			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
				<div class="input-group">
					<label for="phone">{$t('auth.phoneNumber')}</label>
					<input
						id="phone"
						type="tel"
						bind:value={phoneNumber}
						oninput={handlePhoneInput}
						placeholder="+1234567890"
						required
						disabled={isSubmitting}
						class="phone-input"
					/>
				</div>

				<div class="input-group">
					<label for="pin">Backup PIN</label>
					<div class="password-input">
						<input
							id="pin"
							type={showPin ? 'text' : 'password'}
							inputmode="numeric"
							pattern="[0-9]*"
							bind:value={pin}
							maxlength="12"
							oninput={(e) => { pin = e.target.value.replace(/\D/g, '').slice(0, 12); }}
							placeholder="Enter your 6-12 digit PIN"
							required
							disabled={isSubmitting}
							class="code-input"
						/>
						<button
							type="button"
							class="toggle-password"
							onclick={() => (showPin = !showPin)}
							disabled={isSubmitting}
						>
							{showPin ? '👁️' : '👁️‍🗨️'}
						</button>
					</div>
				</div>

				<button type="submit" disabled={isSubmitting || !phoneNumber.trim() || !pin.trim()} class="primary-button">
					{#if isSubmitting}
						<span class="loading-spinner"></span>
						Logging in...
					{:else}
						Login
					{/if}
				</button>
			</form>

			<div class="resend-section">
				<p>Don't have an account? <a href="/register" class="link-button">Register here</a></p>
				<p>Forgot your PIN? <a href="/auth" class="link-button">Login with SMS OTP</a></p>
			</div>
		</div>
	</div>
</div>

<style>
	/* Import styles from global CSS or use same styles as auth page */
	.auth-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: calc(100vh - 60px); /* Account for navbar */
		padding: 2rem 1rem;
		background-color: var(--color-bg-primary);
	}

	.auth-card {
		width: 100%;
		max-width: 480px;
		background-color: var(--color-bg-secondary);
		border-radius: 1rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		border: 1px solid var(--color-border-primary);
	}

	.auth-header {
		padding: 2rem 2rem 1.5rem;
		text-align: center;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.logo-icon {
		font-size: 2rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: 1rem;
		margin: 0;
	}

	.auth-step {
		padding: 2rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-top: 0;
		margin-bottom: 0.5rem;
		color: var(--color-text-primary);
	}

	.step-description {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		background-color: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	input:focus {
		outline: none;
		border-color: var(--color-brand-primary);
		box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
	}
	
	.password-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.toggle-password {
		position: absolute;
		right: 10px;
		background: none;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 5px;
		color: var(--color-text-secondary);
	}

	.primary-button {
		width: 100%;
		padding: 0.875rem;
		background-color: var(--color-brand-primary);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		transition: background-color 0.2s;
	}

	.primary-button:hover:not(:disabled) {
		background-color: var(--color-brand-secondary);
	}

	.primary-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.resend-section {
		margin-top: 1.5rem;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.link-button {
		background: none;
		border: none;
		color: var(--color-brand-primary);
		font-weight: 500;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		font-size: 0.95rem;
	}

	.messages-container {
		padding: 1rem 2rem 0;
	}
	
	.loading-spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 1s ease-in-out infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
