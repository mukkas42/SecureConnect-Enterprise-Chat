<script>
	import { page } from '$app/stores';
	import { currentTheme, themeUtils, themes } from '$lib/stores/theme.js';
	import { currentLanguage, t, i18nUtils, languages } from '$lib/stores/i18n.js';
	import { auth, user, isAuthenticated } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	// Component state
	let themeDropdownOpen = false;
	let languageDropdownOpen = false;
	let userDropdownOpen = false;
	let mobileMenuOpen = false;
	
	// Reactive values
	$: currentThemeInfo = $currentTheme === 'light' ? themes.light : themes.dark;
	$: currentLanguageInfo = getCurrentLanguageInfo($currentLanguage);
	
	// Helper function to get language info safely
	function getCurrentLanguageInfo(/** @type {string} */ langCode) {
		if (langCode === 'en') return languages.en;
		if (langCode === 'es') return languages.es;
		if (langCode === 'fr') return languages.fr;
		if (langCode === 'de') return languages.de;
		if (langCode === 'ar') return languages.ar;
		if (langCode === 'zh') return languages.zh;
		return languages.en;
	}
	
	// Close dropdowns when clicking outside
	function handleClickOutside(/** @type {MouseEvent} */ event) {
		const target = /** @type {Element} */ (event.target);
		if (!target?.closest('.dropdown')) {
			themeDropdownOpen = false;
			languageDropdownOpen = false;
			userDropdownOpen = false;
		}
	}
	
	// Theme switching
	function switchTheme(/** @type {string} */ themeName) {
		themeUtils.setTheme(themeName);
		themeDropdownOpen = false;
	}
	
	// Language switching
	function switchLanguage(/** @type {string} */ languageCode) {
		i18nUtils.setLanguage(languageCode);
		languageDropdownOpen = false;
	}
	
	// Toggle mobile menu
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('mobile-menu-open', mobileMenuOpen);
		}
	}
	
	// Close mobile menu
	function closeMobileMenu() {
		mobileMenuOpen = false;
		if (typeof document !== 'undefined') {
			document.documentElement.classList.remove('mobile-menu-open');
		}
	}

	// Handle logout
	async function handleLogout() {
		await auth.logout();
		closeMobileMenu();
		goto('/');
	}

	// Navigate to login page
	function goToLogin() {
		closeMobileMenu();
		goto('/login');
	}

	// Navigate to register page
	function goToRegister() {
		closeMobileMenu();
		goto('/register');
	}

	// Navigate to profile
	function goToProfile() {
		userDropdownOpen = false;
		if ($user?.username) {
			goto(`/u/${$user.username}`);
		}
	}

	// Navigate to settings
	function goToSettings() {
		userDropdownOpen = false;
		goto('/settings');
	}

	// Handle logout from dropdown
	async function handleDropdownLogout() {
		userDropdownOpen = false;
		await auth.logout();
		goto('/');
	}
	
	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<nav class="navbar">
	<div class="container">
		<div class="navbar-content">
			<!-- Logo -->
			<div class="navbar-brand">
				<a href="/" class="brand-link" on:click={closeMobileMenu}>
					<div class="logo-icon">
						<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
						</svg>
					</div>
					<span class="brand-name">SecureConnect Enterprise Chat</span>
				</a>
			</div>
			
			<div class="flex-spacer"></div>
			
			<!-- Desktop Actions -->
			<div class="navbar-actions desktop-actions">
				<!-- Theme Switcher -->
				<div class="dropdown" class:open={themeDropdownOpen}>
					<button 
						class="btn btn-ghost dropdown-trigger"
						on:click={() => themeDropdownOpen = !themeDropdownOpen}
						aria-label={$t('theme.switch')}
					>
						<span class="theme-icon">
							{#if $currentTheme === 'light'}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="5"/>
									<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
								</svg>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
								</svg>
							{/if}
						</span>
						<span class="sr-only">{$t('theme.switch')}</span>
					</button>
					
					<div class="dropdown-content">
						<button 
							class="dropdown-item"
							class:active={$currentTheme === 'light'}
							on:click={() => switchTheme('light')}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="5"/>
								<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
							</svg>
							{$t('theme.light')}
						</button>
						<button 
							class="dropdown-item"
							class:active={$currentTheme === 'dark'}
							on:click={() => switchTheme('dark')}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
							</svg>
							{$t('theme.dark')}
						</button>
					</div>
				</div>
				
				<!-- Language Switcher -->
				<div class="dropdown" class:open={languageDropdownOpen}>
					<button 
						class="btn btn-ghost dropdown-trigger"
						on:click={() => languageDropdownOpen = !languageDropdownOpen}
						aria-label={$t('language.switch')}
					>
						<span class="language-flag">{currentLanguageInfo.flag}</span>
						<span class="language-code">{$currentLanguage.toUpperCase()}</span>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6,9 12,15 18,9"/>
						</svg>
					</button>
					
					<div class="dropdown-content language-dropdown">
						{#each Object.entries(languages) as [code, lang]}
							<button 
								class="dropdown-item"
								class:active={$currentLanguage === code}
								on:click={() => switchLanguage(code)}
							>
								<span class="language-flag">{lang.flag}</span>
								<span class="language-name">{lang.name}</span>
								{#if $currentLanguage === code}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="20,6 9,17 4,12"/>
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Auth Actions -->
				<div class="auth-actions">
					{#if $isAuthenticated}
						<!-- User Dropdown -->
						<div class="dropdown user-dropdown" class:open={userDropdownOpen}>
							<button
								class="btn btn-ghost dropdown-trigger user-trigger"
								on:click={() => userDropdownOpen = !userDropdownOpen}
								aria-label="User menu"
							>
								<div class="user-avatar">
									{#if $user?.avatarUrl}
										<img src={$user.avatarUrl} alt={$user.displayName} />
									{:else}
										<div class="avatar-placeholder">
											{($user?.displayName || $user?.username || 'U').charAt(0).toUpperCase()}
										</div>
									{/if}
								</div>
								<span class="user-name">{$user?.displayName || $user?.username}</span>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="6,9 12,15 18,9"/>
								</svg>
							</button>
							
							<div class="dropdown-content user-dropdown-content">
								<button
									class="dropdown-item"
									on:click={goToProfile}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
										<circle cx="12" cy="7" r="4"/>
									</svg>
									{$t('nav.profile')}
								</button>
								<button
									class="dropdown-item"
									on:click={goToSettings}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="3"/>
										<path d="M12 1v6m0 6v6m6-12h-6m-6 0h6"/>
									</svg>
									{$t('nav.settings')}
								</button>

								<div class="dropdown-divider"></div>
								<button
									class="dropdown-item logout-item"
									on:click={handleDropdownLogout}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
										<polyline points="16,17 21,12 16,7"/>
										<line x1="21" y1="12" x2="9" y2="12"/>
									</svg>
									{$t('nav.logout')}
								</button>
							</div>
						</div>
					{:else}
						<button class="btn btn-ghost" on:click={goToLogin}>{$t('nav.login')}</button>
						<button class="btn btn-primary" on:click={goToRegister}>{$t('nav.register')}</button>
					{/if}
				</div>
			</div>
			
			<!-- Mobile Menu Button -->
			<button 
				class="mobile-menu-btn"
				class:active={mobileMenuOpen}
				on:click={toggleMobileMenu}
				aria-label="Toggle mobile menu"
			>
				<span class="hamburger-line"></span>
				<span class="hamburger-line"></span>
				<span class="hamburger-line"></span>
			</button>
		</div>
	</div>
	
	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div class="mobile-menu">
			<div class="mobile-menu-content">
				<div class="mobile-menu-actions">
					{#if $isAuthenticated}
						<div class="mobile-user-info">
							<div class="user-avatar">
								{#if $user?.avatarUrl}
									<img src={$user.avatarUrl} alt={$user.displayName} />
								{:else}
									<div class="avatar-placeholder">
										{($user?.displayName || $user?.username || 'U').charAt(0).toUpperCase()}
									</div>
								{/if}
							</div>
							<div class="user-details">
								<span class="user-name">{$user?.displayName || $user?.username}</span>
								<span class="user-email">{$user?.email || ''}</span>
							</div>
						</div>
						<div class="mobile-menu-divider"></div>
						<button class="mobile-menu-item" on:click={goToProfile}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
								<circle cx="12" cy="7" r="4"/>
							</svg>
							{$t('nav.profile')}
						</button>
						<button class="mobile-menu-item" on:click={goToSettings}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="3"/>
								<path d="M12 1v6m0 6v6m6-12h-6m-6 0h6"/>
							</svg>
							{$t('nav.settings')}
						</button>
						<div class="mobile-menu-divider"></div>
						<button class="mobile-menu-item logout-item" on:click={handleLogout}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
								<polyline points="16,17 21,12 16,7"/>
								<line x1="21" y1="12" x2="9" y2="12"/>
							</svg>
							{$t('nav.logout')}
						</button>
					{:else}
						<button class="btn btn-primary w-full" on:click={goToRegister}>{$t('nav.register')}</button>
						<button class="btn btn-ghost w-full" on:click={goToLogin}>{$t('nav.login')}</button>
					{/if}
				</div>
				
				<div class="mobile-menu-divider"></div>
				
				<div class="mobile-settings">
					<div class="mobile-setting-item">
						<span>{$t('theme.switch')}</span>
						<div class="theme-toggle-group">
							<button 
								class="theme-toggle-btn" 
								class:active={$currentTheme === 'light'}
								on:click={() => switchTheme('light')}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="5"/>
									<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
								</svg>
							</button>
							<button 
								class="theme-toggle-btn" 
								class:active={$currentTheme === 'dark'}
								on:click={() => switchTheme('dark')}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
								</svg>
							</button>
						</div>
					</div>
					
					<div class="mobile-setting-item">
						<span>{$t('language.switch')}</span>
						<select 
							class="language-select" 
							value={$currentLanguage} 
							on:change={(e) => switchLanguage(e.currentTarget.value)}
						>
							{#each Object.entries(languages) as [code, lang]}
								<option value={code}>{lang.flag} {lang.name}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
	{/if}
</nav>

<style>
	.navbar {
		height: 72px;
		background: var(--glass-bg);
		backdrop-filter: var(--glass-blur);
		border-bottom: 1px solid var(--glass-border);
		position: sticky;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		transition: all 0.3s ease;
	}
	
	.navbar.scrolled {
		height: 64px;
		box-shadow: var(--shadow-md);
	}
	
	.flex-spacer {
		flex: 1;
	}
	
	.navbar-content {
		display: flex;
		align-items: center;
		height: 100%;
		padding: 0 var(--space-4);
	}
	
	.navbar-brand {
		flex-shrink: 0;
	}
	
	.brand-link {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		text-decoration: none;
		color: var(--color-text-primary);
		transition: transform 0.2s ease;
	}
	
	.brand-link:hover {
		transform: scale(1.02);
	}
	
	.logo-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary));
		border-radius: var(--radius-xl);
		color: white;
		box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
	}
	
	.brand-name {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}
	
	.desktop-actions {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}
	
	.auth-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	
	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2) var(--space-5);
		font-family: 'Plus Jakarta Sans', sans-serif;
		font-weight: 600;
		font-size: 0.9375rem;
		border-radius: var(--radius-lg);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
		border: none;
	}
	
	.btn-primary {
		background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary));
		color: white;
		box-shadow: 0 4px 14px 0 rgba(6, 182, 212, 0.3);
	}
	
	.btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
	}
	
	.btn-ghost {
		background: transparent;
		color: var(--color-text-secondary);
	}
	
	.btn-ghost:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}
	
	/* Dropdowns */
	.dropdown {
		position: relative;
	}
	
	.dropdown-trigger {
		padding: var(--space-2);
		border-radius: var(--radius-lg);
	}
	
	.dropdown-content {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		min-width: 180px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-xl);
		padding: var(--space-2);
		box-shadow: var(--shadow-xl);
		opacity: 0;
		visibility: hidden;
		transform: translateY(10px);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 100;
	}
	
	.dropdown.open .dropdown-content {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}
	
	.dropdown-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2-5) var(--space-4);
		color: var(--color-text-secondary);
		text-align: left;
		border-radius: var(--radius-md);
		transition: all 0.2s ease;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 0.9375rem;
		font-weight: 500;
	}
	
	.dropdown-item:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}
	
	.dropdown-item.active {
		color: var(--color-brand-primary);
		background: rgba(6, 182, 212, 0.1);
	}
	
	.dropdown-divider {
		height: 1px;
		background: var(--color-border-primary);
		margin: var(--space-2) 0;
	}
	
	/* User Avatar */
	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-bg-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-border-secondary);
	}
	
	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.avatar-placeholder {
		font-weight: 700;
		font-size: 0.875rem;
		color: white;
	}
	
	.user-trigger {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1-5) var(--space-3);
	}
	
	.user-name {
		font-size: 0.9375rem;
		font-weight: 600;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	/* Mobile Styles */
	.mobile-menu-btn {
		display: none;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		width: 40px;
		height: 40px;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 8px;
		z-index: 1100;
	}
	
	.hamburger-line {
		width: 100%;
		height: 2px;
		background: var(--color-text-primary);
		border-radius: 2px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.mobile-menu-btn.active .hamburger-line:nth-child(1) {
		transform: translateY(8px) rotate(45deg);
	}
	
	.mobile-menu-btn.active .hamburger-line:nth-child(2) {
		opacity: 0;
	}
	
	.mobile-menu-btn.active .hamburger-line:nth-child(3) {
		transform: translateY(-8px) rotate(-45deg);
	}
	
	.mobile-menu {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--color-bg-primary);
		z-index: 1050;
		padding-top: 80px;
		animation: slideIn 0.3s cubic-bezier(0, 0, 0.2, 1);
	}
	
	.mobile-menu-content {
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}
	
	.mobile-menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		color: var(--color-text-primary);
		text-decoration: none;
		font-size: 1.125rem;
		font-weight: 600;
		border-radius: var(--radius-xl);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		width: 100%;
		cursor: pointer;
	}
	
	.mobile-menu-divider {
		height: 1px;
		background: var(--color-border-primary);
	}
	
	.mobile-user-info {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-2);
	}
	
	.user-details {
		display: flex;
		flex-direction: column;
	}
	
	.user-email {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}
	
	.mobile-settings {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	
	.mobile-setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2);
		color: var(--color-text-secondary);
		font-weight: 500;
	}
	
	.theme-toggle-group {
		display: flex;
		background: var(--color-bg-tertiary);
		padding: 4px;
		border-radius: var(--radius-lg);
	}
	
	.theme-toggle-btn {
		padding: 8px 16px;
		border-radius: var(--radius-md);
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	
	.theme-toggle-btn.active {
		background: var(--color-bg-accent);
		color: var(--color-brand-primary);
	}
	
	.language-select {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		padding: 8px 12px;
		border-radius: var(--radius-lg);
		font-family: inherit;
	}
	
	@media (max-width: 1024px) {
		.desktop-actions, .desktop-nav {
			display: none;
		}
		
		.mobile-menu-btn {
			display: flex;
			margin-left: auto;
		}
	}
	
	@keyframes slideIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
