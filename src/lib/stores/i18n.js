import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import enTranslations from '../locales/en.js';

// Language configurations
export const languages = {
	en: {
		name: 'English',
		flag: '🇺🇸',
		rtl: false
	},
	es: {
		name: 'Español',
		flag: '🇪🇸',
		rtl: false
	},
	fr: {
		name: 'Français',
		flag: '🇫🇷',
		rtl: false
	},
	de: {
		name: 'Deutsch',
		flag: '🇩🇪',
		rtl: false
	},
	ar: {
		name: 'العربية',
		flag: '🇸🇦',
		rtl: true
	},
	zh: {
		name: '中文',
		flag: '🇨🇳',
		rtl: false
	}
};

// Normalize enTranslations to handle different module formats (ESM default vs module object)
const en = enTranslations.default || enTranslations;

// Cache for loaded translations, initialized with English
const translationCache = new Map([['en', en]]);

// Get initial language from localStorage or browser preference
function getInitialLanguage() {
	if (!browser) return 'en';
	
	const stored = localStorage.getItem('app-language');
	if (stored && Object.prototype.hasOwnProperty.call(languages, stored)) {
		return stored;
	}
	
	// Check browser language preference
	const browserLang = navigator.language.split('-')[0];
	if (Object.prototype.hasOwnProperty.call(languages, browserLang)) {
		return browserLang;
	}
	
	return 'en';
}

// Create language store
export const currentLanguage = writable(getInitialLanguage());

// Store for loaded translations, initialized with English
const loadedTranslations = writable({ en: en });

/**
 * Load translations for a specific language
 * @param {string} languageCode - Language code to load
 * @returns {Promise<Object>} Translation object
 */
async function loadTranslations(languageCode) {
	// English is already loaded
	if (languageCode === 'en') return en;
	
	// Check cache first
	if (translationCache.has(languageCode)) {
		return translationCache.get(languageCode);
	}

	try {
		// Import dynamically
		let module;
		switch(languageCode) {
			case 'es': module = await import('../locales/es.js'); break;
			case 'fr': module = await import('../locales/fr.js'); break;
			case 'de': module = await import('../locales/de.js'); break;
			case 'ar': module = await import('../locales/ar.js'); break;
			case 'zh': module = await import('../locales/zh.js'); break;
			default: module = { default: en };
		}
		
		const translations = module.default || module;
		
		if (!translations) {
			throw new Error('Translation file did not export a default object');
		}
		
		// Cache the translations
		translationCache.set(languageCode, translations);
		
		// Update the store
		loadedTranslations.update(current => ({
			...current,
			[languageCode]: translations
		}));
		
		console.log(`📝 [i18n] Loaded translations for language: ${languageCode}`);
		return translations;
	} catch (error) {
		console.error(`📝 [i18n] Failed to load translations for ${languageCode}:`, error);
		return en;
	}
}

// Derived store for current translations
export const t = derived(
	[currentLanguage, loadedTranslations],
	([$currentLanguage, $loadedTranslations], set) => {
		const translate = (key, params = {}) => {
			// Try current language first, then fallback to English, then the key itself
			const currentTranslations = $loadedTranslations[$currentLanguage] || {};
			let translation = currentTranslations[key] || en[key] || key;
			
			// Replace parameters in translation
			if (params && typeof params === 'object') {
				Object.entries(params).forEach(([param, value]) => {
					translation = translation.replace(new RegExp(`{{\\s*${param}\\s*}}`, 'g'), String(value));
				});
			}
			
			return translation;
		};
		
		set(translate);

		// If translations aren't loaded yet for this language, trigger load
		if (browser && $currentLanguage !== 'en' && !$loadedTranslations[$currentLanguage]) {
			loadTranslations($currentLanguage).catch(err => {
				console.error('Failed to load language after selection:', err);
			});
		}
	},
	(key) => en[key] || key // Initial value using English fallback
);

// Language utilities
export const i18nUtils = {
	/**
	 * Set the current language and load its translations
	 * @param {string} languageCode - Language code ('en', 'es', etc.)
	 */
	async setLanguage(languageCode) {
		if (!Object.prototype.hasOwnProperty.call(languages, languageCode)) {
			console.warn(`📝 [i18n] Language "${languageCode}" not found`);
			return;
		}
		
		console.log(`📝 [i18n] Switching to language: ${languageCode}`);
		
		// Load translations first
		if (languageCode !== 'en') {
			await loadTranslations(languageCode);
		}
		
		// Then update the current language
		currentLanguage.set(languageCode);
		
		if (browser) {
			localStorage.setItem('app-language', languageCode);
			this.applyLanguage(languageCode);
		}
	},
	
	/**
	 * Apply language settings to document
	 * @param {string} languageCode - Language code
	 */
	applyLanguage(languageCode) {
		if (!browser || !Object.prototype.hasOwnProperty.call(languages, languageCode)) return;
		
		const language = languages[languageCode];
		if (!language) return;
		
		const root = document.documentElement;
		
		// Set language attribute
		root.setAttribute('lang', languageCode);
		
		// Set direction for RTL languages
		root.setAttribute('dir', language.rtl ? 'rtl' : 'ltr');
		
		// Set data attribute for CSS selectors
		root.setAttribute('data-language', languageCode);
		
		console.log(`📝 [i18n] Applied language settings for: ${languageCode} (RTL: ${language.rtl})`);
	},
	
	/**
	 * Preload translations for a language
	 * @param {string} languageCode - Language code to preload
	 */
	async preloadLanguage(languageCode) {
		if (languageCode !== 'en') {
			await loadTranslations(languageCode);
		}
	},
	
	/**
	 * Get available languages
	 * @returns {object} Available languages
	 */
	getAvailableLanguages() {
		return languages;
	},
	
	/**
	 * Get current language info
	 * @param {string} currentLang - Current language code
	 * @returns {object} Language info
	 */
	getCurrentLanguageInfo(currentLang) {
		return languages[currentLang] || languages.en;
	},
	
	/**
	 * Check if translations are loaded for a language
	 * @param {string} languageCode - Language code to check
	 * @returns {boolean} Whether translations are loaded
	 */
	isLanguageLoaded(languageCode) {
		return languageCode === 'en' || translationCache.has(languageCode);
	},
	
	/**
	 * Clear translation cache (useful for development)
	 */
	clearCache() {
		translationCache.clear();
		translationCache.set('en', en);
		loadedTranslations.set({ en: en });
		console.log('📝 [i18n] Translation cache cleared');
	}
};

// Initialize language on client side only
if (browser) {
	const initialLanguage = getInitialLanguage();
	
	// Apply language settings immediately
	i18nUtils.applyLanguage(initialLanguage);
	
	// Load initial translations
	if (initialLanguage !== 'en') {
		loadTranslations(initialLanguage).then(() => {
			console.log(`📝 [i18n] Initial language loaded: ${initialLanguage}`);
		}).catch(error => {
			console.error(`📝 [i18n] Failed to load initial language ${initialLanguage}:`, error);
		});
	}
}
