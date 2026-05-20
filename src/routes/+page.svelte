<script>
	import { t } from '$lib/stores/i18n.js';
</script>

<div class="hero">
	<div class="container">
		<div class="hero-content">
			<div class="hero-text">
				<p class="hero-tagline">
					{$t('home.hero.tagline')}
				</p>
				<h1 class="hero-title">
					{$t('home.hero.title')}
				</h1>
				<p class="hero-description">
					{$t('home.hero.description')}
				</p>
				<div class="hero-actions">
					<a href="/register" class="btn btn-primary">
						{$t('nav.register')}
					</a>
					<a href="/login" class="btn btn-secondary">
						{$t('nav.login')}
					</a>
				</div>
			</div>
			<div class="hero-visual">
				<div class="visual-wrapper">
					<img src="/hero.svg" alt="SecureConnect Enterprise Chat Hero" class="hero-image" />
					<div class="glow-effect"></div>
				</div>
			</div>
		</div>
	</div>
</div>

<section class="features">
	<div class="container">
		<div class="section-header">
			<h2>{$t('home.features.title')}</h2>
			<p>{$t('home.features.subtitle')}</p>
		</div>
		<div class="features-grid">
			<div class="feature-card">
				<div class="feature-icon">🛡️</div>
				<h3>{$t('home.feature.1.title')}</h3>
				<p>{$t('home.feature.1.description')}</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">📱</div>
				<h3>{$t('home.feature.2.title')}</h3>
				<p>{$t('home.feature.2.description')}</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">🔐</div>
				<h3>{$t('home.feature.3.title')}</h3>
				<p>{$t('home.feature.3.description')}</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">⚡</div>
				<h3>{$t('home.feature.4.title')}</h3>
				<p>{$t('home.feature.4.description')}</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">🌐</div>
				<h3>{$t('home.feature.5.title')}</h3>
				<p>{$t('home.feature.5.description')}</p>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		background: radial-gradient(circle at 10% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 40%),
		            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
		            var(--color-bg-primary);
		padding: var(--space-32) 0;
		min-height: calc(100vh - 72px);
		display: flex;
		align-items: center;
		position: relative;
		overflow: hidden;
	}
	
	.hero-content {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: var(--space-12);
		align-items: center;
	}
	
	@media (max-width: 1024px) {
		.hero-content {
			grid-template-columns: 1fr;
			text-align: center;
			gap: var(--space-16);
		}
		
		.hero-description {
			margin-left: auto;
			margin-right: auto;
		}
		
		.hero-actions {
			justify-content: center;
		}
	}
	
	.hero-text > * {
		opacity: 0;
		transform: translateY(20px);
		animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}
	
	.hero-tagline {
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-brand-primary);
		margin-bottom: var(--space-4);
		animation-delay: 0.1s;
	}
	
	.hero-title {
		font-size: clamp(3.5rem, 8vw, 6rem);
		font-weight: 800;
		line-height: 1;
		margin-bottom: var(--space-6);
		letter-spacing: -0.04em;
		color: var(--color-text-primary);
		animation-delay: 0.2s;
	}
	
	.hero-description {
		font-size: 1.35rem;
		line-height: 1.6;
		margin-bottom: var(--space-10);
		color: var(--color-text-secondary);
		max-width: 600px;
		animation-delay: 0.3s;
	}
	
	.hero-actions {
		display: flex;
		gap: var(--space-4);
		animation-delay: 0.4s;
	}
	
	.hero-actions .btn {
		padding: var(--space-4) var(--space-10);
		font-size: 1.125rem;
		font-weight: 700;
		border-radius: var(--radius-xl);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.hero-actions .btn-primary {
		background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary));
		color: white;
		border: none;
		box-shadow: 0 10px 30px -10px rgba(6, 182, 212, 0.5);
	}
	
	.hero-actions .btn-primary:hover {
		transform: translateY(-4px) scale(1.02);
		box-shadow: 0 20px 40px -15px rgba(6, 182, 212, 0.6);
	}
	
	.hero-actions .btn-secondary {
		background: var(--glass-bg);
		backdrop-filter: var(--glass-blur);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-secondary);
	}
	
	.hero-actions .btn-secondary:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-brand-primary);
		transform: translateY(-4px);
	}
	
	.hero-visual {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		animation: fadeInRight 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
		animation-delay: 0.2s;
		opacity: 0;
	}
	
	.visual-wrapper {
		position: relative;
		width: 100%;
		max-width: 500px;
	}
	
	.hero-image {
		width: 100%;
		height: auto;
		filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.3));
		animation: float 6s ease-in-out infinite;
		z-index: 2;
		position: relative;
	}
	
	.glow-effect {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 120%;
		height: 120%;
		background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%);
		z-index: 1;
		pointer-events: none;
	}
	
	.features {
		padding: var(--space-32) 0;
		background: var(--color-bg-secondary);
	}
	
	.section-header {
		text-align: center;
		margin-bottom: var(--space-20);
	}
	
	.section-header h2 {
		font-size: 3rem;
		font-weight: 800;
		margin-bottom: var(--space-4);
		color: var(--color-text-primary);
	}
	
	.section-header p {
		font-size: 1.25rem;
		color: var(--color-text-secondary);
	}
	
	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-8);
	}
	
	.feature-card {
		background: var(--color-bg-tertiary);
		padding: var(--space-8);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--color-border-primary);
		transition: all 0.4s ease;
		position: relative;
		overflow: hidden;
	}
	
	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), transparent);
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	
	.feature-card:hover {
		transform: translateY(-8px);
		border-color: var(--color-brand-primary);
		box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.5);
	}
	
	.feature-card:hover::before {
		opacity: 1;
	}
	
	.feature-icon {
		font-size: 2.5rem;
		margin-bottom: var(--space-6);
	}
	
	.feature-card h3 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: var(--space-4);
		color: var(--color-text-primary);
	}
	
	.feature-card p {
		color: var(--color-text-secondary);
		line-height: 1.7;
	}
	
	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(30px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	@keyframes fadeInRight {
		from { opacity: 0; transform: translateX(30px); }
		to { opacity: 1; transform: translateX(0); }
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-20px); }
	}
</style>
