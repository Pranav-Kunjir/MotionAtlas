<script lang="ts">
    import Map from "$lib/components/maplibre-gl.svelte"
	let name = "MotionAtlas";
</script>

<svelte:head>
	<title>{name} — Cinematic Route Replays</title>
</svelte:head>

<div class="app">
	<!-- Ambient background mesh -->
	<div class="ambient">
		<div class="ambient__orb ambient__orb--blue"></div>
		<div class="ambient__orb ambient__orb--purple"></div>
		<div class="ambient__orb ambient__orb--teal"></div>
	</div>

	<!-- Top bar -->
	<header class="topbar">
		<div class="topbar__leading">
			<div class="topbar__icon">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
					<path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" fill="url(#icon-fill)" opacity="0.9"/>
					<path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="rgba(255,255,255,0.3)" stroke-width="0.75" fill="none"/>
					<circle cx="12" cy="12" r="2.5" fill="white" opacity="0.9"/>
					<defs>
						<linearGradient id="icon-fill" x1="2" y1="2" x2="22" y2="22">
							<stop stop-color="#0A84FF"/>
							<stop offset="1" stop-color="#5E5CE6"/>
						</linearGradient>
					</defs>
				</svg>
			</div>
			<span class="topbar__title">{name}</span>
		</div>
		<span class="topbar__subtitle">Route Replay Studio</span>
	</header>

	<!-- Workspace -->
	<main class="workspace-wrapper">
		<Map />
	</main>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		position: relative;
	}

	/* ─── Ambient Background ─── */
	.ambient {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.ambient__orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(100px);
		animation: gentlePulse 8s ease-in-out infinite;
	}

	.ambient__orb--blue {
		width: 500px;
		height: 500px;
		top: -10%;
		right: -5%;
		background: rgba(10, 132, 255, 0.06);
		animation-delay: 0s;
	}

	.ambient__orb--purple {
		width: 400px;
		height: 400px;
		bottom: -5%;
		left: -5%;
		background: rgba(94, 92, 230, 0.05);
		animation-delay: 2.5s;
	}

	.ambient__orb--teal {
		width: 350px;
		height: 350px;
		top: 40%;
		left: 50%;
		background: rgba(100, 210, 255, 0.03);
		animation-delay: 5s;
	}

	/* ─── Top Bar ─── */
	.topbar {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
		background: rgba(28, 28, 30, 0.65);
		backdrop-filter: blur(40px) saturate(180%);
		-webkit-backdrop-filter: blur(40px) saturate(180%);
		border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
		animation: fadeIn 0.5s var(--ease-apple) both;
	}

	.topbar__leading {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.topbar__icon {
		display: flex;
		align-items: center;
	}

	.topbar__title {
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.topbar__subtitle {
		font-size: 0.8125rem;
		color: var(--text-tertiary);
		font-weight: 400;
	}

	/* ─── Workspace ─── */
	.workspace-wrapper {
		flex: 1;
		position: relative;
		z-index: 1;
		padding: 1rem 1.25rem 1.25rem;
		animation: fadeInUp 0.6s var(--ease-apple) 0.1s both;
	}

	@media (max-width: 768px) {
		.topbar {
			flex-direction: column;
			gap: 0.25rem;
			text-align: center;
			padding: 0.75rem 1rem;
		}

		.workspace-wrapper {
			padding: 0.75rem;
		}
	}
</style>
