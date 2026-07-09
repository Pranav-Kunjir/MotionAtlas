<script lang="ts">
	import { onMount } from "svelte";
	import maplibregl from "maplibre-gl";
	import { createMap } from "$lib/map/createMap";
	import { RouteAnimator } from "$lib/map/replay";
    import {
        DEFAULT_REPLAY_SETTINGS,
        type ReplaySettings
    } from "$lib/defaults";

    let settings = $state<ReplaySettings>(
        structuredClone(DEFAULT_REPLAY_SETTINGS)
    );
	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;

	let width = $state(720);
	let height = $state(1200);

	let portrait = $state(true);
	let selectedResolution = $state("1080p");

	const resolutions = {
		"720p": { width: 1280, height: 720 },
		"1080p": { width: 1920, height: 1080 },
	} as const;

	let viewportHeight = $state(0);
    let animator = $state<RouteAnimator | null>(null);
    let fileLoaded = $state(false);
    let countdown = $state(0);
    let isRecording = $state(false);
    let isAnimating = $state(false);

    onMount(() => {
        viewportHeight = window.innerHeight;

        const onResize = () => {
            viewportHeight = window.innerHeight;
            map?.resize();
        };

        window.addEventListener("resize", onResize);

        map = createMap(mapContainer, settings);

        map.addControl(
            new maplibregl.NavigationControl({
                showCompass: true,
                showZoom: true,
                visualizePitch: true
            }),
            "top-right"
        );

        applyResolution();

        return () => {
            window.removeEventListener("resize", onResize);
            map.remove();
        };
    });

    const previewScale = $derived(
        Math.min((viewportHeight * 0.8) / height, 1)
    );

	function applyResolution() {
		const res = resolutions[selectedResolution as keyof typeof resolutions];

		if (portrait) {
			width = res.height;
			height = res.width;
		} else {
			width = res.width;
			height = res.height;
		}

		requestAnimationFrame(() => {
			map?.resize();
		});
	}

	function toggleOrientation() {
		portrait = !portrait;
		applyResolution();
	}

	/* ── Drag & drop state ── */
	let isDragOver = $state(false);
	let fileName = $state("");

    /* ── Strava Import state ── */
    let importMode = $state<"file" | "strava">("file");
    let stravaUrl = $state("");
    let stravaId = $derived(
        stravaUrl.match(/(?:activities\/)(\d+)/)?.[1] || 
        stravaUrl.match(/^(\d+)$/)?.[1] || 
        ""
    );
    let stravaExportUrl = $derived(
        stravaId ? `https://www.strava.com/activities/${stravaId}/export_gpx` : ""
    );

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

    async function processFile(file: File) {
        if (!file || !map) return;
		fileName = file.name;
        animator = new RouteAnimator(map, settings);
        animator.onComplete = () => {
            isRecording = false;
            isAnimating = false;
        };
        await animator.loadFile(file);
        fileLoaded = true;
    }

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const file = e.dataTransfer?.files?.[0];
        if (file) await processFile(file);
	}

	async function handleFileInput(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) await processFile(file);
	}

    function startAction(record: boolean) {
        if (!animator || isAnimating) return;
        countdown = 3;
        let interval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(interval);
                if (record) isRecording = true;
                isAnimating = true;
                animator!.start(record);
            }
        }, 1000);
    }

	/* ── Advanced panel ── */
	let advancedOpen = $state(false);

	function resetSettings() {
		const defaults = structuredClone(DEFAULT_REPLAY_SETTINGS);
		settings.zoom = defaults.zoom;
		settings.pitch = defaults.pitch;
		settings.bearing = defaults.bearing;
		settings.speed = defaults.speed;
		settings.followRunner = defaults.followRunner;
		settings.lineWidth = defaults.lineWidth;
		settings.runnerRadius = defaults.runnerRadius;
	}
</script>

<div class="studio">
	<!-- ── Sidebar ── -->
	<aside class="sidebar glass-panel">
		<!-- Canvas Settings -->
		<section class="section">
			<h3 class="section__heading">Canvas</h3>

			<div class="field">
				<label class="field__label" for="res">Resolution</label>
				<div class="segmented-control">
					{#each Object.keys(resolutions) as res (res)}
						<button
							class="segment"
							class:segment--active={selectedResolution === res}
							onclick={() => { selectedResolution = res; applyResolution(); }}
						>
							{res}
						</button>
					{/each}
				</div>
			</div>

			<div class="field" role="group" aria-labelledby="orientation-label">
				<span class="field__label" id="orientation-label">Orientation</span>
				<div class="segmented-control">
					<button
						class="segment"
						class:segment--active={portrait}
						onclick={() => { if (!portrait) toggleOrientation(); }}
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<rect x="4.5" y="2" width="7" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
						</svg>
						Portrait
					</button>
					<button
						class="segment"
						class:segment--active={!portrait}
						onclick={() => { if (portrait) toggleOrientation(); }}
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<rect x="2" y="4.5" width="12" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
						</svg>
						Landscape
					</button>
				</div>
			</div>
		</section>

		<div class="divider"></div>

		<!-- File Upload -->
		<section class="section">
			<h3 class="section__heading">Route Source</h3>

            <div class="segmented-control" style="margin-bottom: 0.25rem;">
                <button class="segment" class:segment--active={importMode === 'file'} onclick={() => importMode = 'file'}>File Upload</button>
                <button class="segment" class:segment--active={importMode === 'strava'} onclick={() => importMode = 'strava'}>Strava Link</button>
            </div>

            {#if importMode === 'file'}
                <label
                    class="dropzone"
                    class:dropzone--hover={isDragOver}
                    class:dropzone--loaded={fileName}
                    ondragover={handleDragOver}
                    ondragleave={handleDragLeave}
                    ondrop={handleDrop}
                >
                    <input
                        type="file"
                        accept=".gpx"
                        class="dropzone__input"
                        onchange={handleFileInput}
                    />

                    {#if fileName}
                        <div class="dropzone__success">
                            <div class="dropzone__check">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.333 4L6 11.333L2.667 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <span class="dropzone__file">{fileName}</span>
                        </div>
                    {:else}
                        <div class="dropzone__idle">
                            <div class="dropzone__icon-ring">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 16V4M12 4L8 8M12 4L16 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <span class="dropzone__text">Drop .gpx file</span>
                            <span class="dropzone__hint">or click to browse</span>
                        </div>
                    {/if}
                </label>
            {:else}
                <div class="strava-import">
                    <input 
                        type="text" 
                        class="apple-input" 
                        placeholder="Paste Strava Activity URL..."
                        bind:value={stravaUrl}
                    />
                    {#if stravaExportUrl}
                        <div class="tutorial-steps">
                            <div class="step">
                                <span class="step-num">1</span>
                                <p>Ensure you are <a href="https://www.strava.com/login" target="_blank" rel="noopener noreferrer">logged into Strava</a>.</p>
                            </div>
                            <div class="step">
                                <span class="step-num">2</span>
                                <button
                                    class="btn-primary"
                                    onclick={() => window.open(stravaExportUrl, "_blank")}
                                    >
                                    Download GPX
                                    </button>
                                
                                <!-- <a href={stravaExportUrl} class="btn-primary" style="text-decoration: none;" download>Download GPX</a> -->
                            </div>
                            <div class="step">
                                <span class="step-num">3</span>
                                <p>Switch to <strong>File Upload</strong> and drop it here.</p>
                            </div>
                        </div>
                    {:else}
                        <div class="tutorial-steps" style="opacity: 0.5;">
                            <div class="step">
                                <span class="step-num">i</span>
                                <p>Paste a link like:<br/><em>strava.com/activities/12345678</em></p>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if fileLoaded}
                <div class="playback-controls">
                    <button class="btn-primary" onclick={() => startAction(true)} disabled={isAnimating || countdown > 0}>
                        <div class="recording-dot"></div>
                        Start Recording
                    </button>
                    <button class="btn-secondary" onclick={() => startAction(false)} disabled={isAnimating || countdown > 0}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M4 3L13 8L4 13V3Z" fill="currentColor"/>
                        </svg>
                        Preview
                    </button>
                </div>
            {/if}
		</section>

		<div class="divider"></div>

		<!-- Advanced Settings (collapsible) -->
		<section class="section">
			<button
				class="advanced-toggle"
				onclick={() => advancedOpen = !advancedOpen}
			>
				<h3 class="section__heading" style="margin: 0;">Advanced</h3>
				<svg
					class="advanced-toggle__chevron"
					class:advanced-toggle__chevron--open={advancedOpen}
					width="14" height="14" viewBox="0 0 14 14" fill="none"
				>
					<path d="M4.5 5.5L7 8L9.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			{#if advancedOpen}
				<div class="advanced-panel">
					<!-- Camera Group -->
					<div class="param-group">
						<span class="param-group__label">Camera</span>

						<div class="slider-field">
							<div class="slider-field__header">
								<label class="slider-field__label" for="zoom">Zoom</label>
								<span class="slider-field__value">{settings.zoom}</span>
							</div>
							<input id="zoom" type="range" class="apple-slider" min="1" max="20" step="0.5" bind:value={settings.zoom} />
						</div>

						<div class="slider-field">
							<div class="slider-field__header">
								<label class="slider-field__label" for="pitch">Pitch</label>
								<span class="slider-field__value">{settings.pitch}°</span>
							</div>
							<input id="pitch" type="range" class="apple-slider" min="0" max="85" step="1" bind:value={settings.pitch} />
						</div>

						<div class="slider-field">
							<div class="slider-field__header">
								<label class="slider-field__label" for="bearing">Bearing</label>
								<span class="slider-field__value">{settings.bearing}°</span>
							</div>
							<input id="bearing" type="range" class="apple-slider" min="0" max="360" step="1" bind:value={settings.bearing} />
						</div>
					</div>

					<!-- Playback Group -->
					<div class="param-group">
						<span class="param-group__label">Playback</span>

						<div class="slider-field">
							<div class="slider-field__header">
								<label class="slider-field__label" for="speed">Speed</label>
								<span class="slider-field__value">{settings.speed}×</span>
							</div>
							<input id="speed" type="range" class="apple-slider" min="1" max="20" step="1" bind:value={settings.speed} />
						</div>

						<div class="toggle-field">
							<label class="toggle-field__label" for="followRunner">Follow runner</label>
							<button
								id="followRunner"
								class="apple-toggle"
								class:apple-toggle--on={settings.followRunner}
								onclick={() => settings.followRunner = !settings.followRunner}
								role="switch"
								aria-checked={settings.followRunner}
                                aria-label="Toggle follow runner"
							>
								<span class="apple-toggle__knob"></span>
							</button>
						</div>
					</div>

					<!-- Style Group -->
					<div class="param-group">
						<span class="param-group__label">Style</span>

						<div class="slider-field">
							<div class="slider-field__header">
								<label class="slider-field__label" for="lineWidth">Line width</label>
								<span class="slider-field__value">{settings.lineWidth}px</span>
							</div>
							<input id="lineWidth" type="range" class="apple-slider" min="1" max="20" step="1" bind:value={settings.lineWidth} />
						</div>

						<div class="slider-field">
							<div class="slider-field__header">
								<label class="slider-field__label" for="runnerRadius">Runner size</label>
								<span class="slider-field__value">{settings.runnerRadius}px</span>
							</div>
							<input id="runnerRadius" type="range" class="apple-slider" min="2" max="20" step="1" bind:value={settings.runnerRadius} />
						</div>
					</div>

					<!-- Reset button -->
					<button class="reset-btn" onclick={resetSettings}>
						<svg width="13" height="13" viewBox="0 0 16 16" fill="none">
							<path d="M2 2V6H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M4.5 10A5 5 0 1 0 5.2 5L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						Reset to defaults
					</button>
				</div>
			{/if}
		</section>

		<!-- Info pill -->
		<div class="info-pill">
			<span>{width} × {height}</span>
		</div>
	</aside>

	<!-- ── Map Preview ── -->
	<div class="preview-area">
		<div
			class="preview-frame"
			style:width={`${width * previewScale}px`}
			style:height={`${height * previewScale}px`}
		>
			<div
				class="preview-canvas"
				style:width={`${width}px`}
				style:height={`${height}px`}
				style:transform={`scale(${previewScale})`}
			>
				<div bind:this={mapContainer} class="map"></div>
                
                {#if countdown > 0}
                    <div class="countdown-overlay">
                        <span>{countdown}</span>
                    </div>
                {/if}

                {#if isRecording}
                    <div class="recording-indicator">
                        <div class="recording-dot recording-dot--pulse"></div>
                        REC
                    </div>
                {/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* ─── Studio Layout ─── */
	.studio {
		display: flex;
		gap: 1rem;
		height: calc(100vh - 5rem);
		min-height: 400px;
	}

	/* ─── Sidebar ─── */
	.sidebar {
		width: 280px;
		min-width: 280px;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		gap: 0;
		overflow-y: auto;
		overflow-x: hidden;
	}

	/* ─── Sections ─── */
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section__heading {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-tertiary);
	}

	.divider {
		height: 0.5px;
		background: var(--glass-border);
		margin: 1rem 0;
	}

	/* ─── Fields ─── */
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field__label {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-weight: 400;
	}

	/* ─── Segmented Control ─── */
	.segmented-control {
		display: flex;
		background: rgba(255, 255, 255, 0.04);
		border-radius: var(--radius-sm);
		padding: 2px;
		gap: 1px;
		border: 0.5px solid rgba(255, 255, 255, 0.06);
	}

	.segment {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.4rem 0.5rem;
		border-radius: calc(var(--radius-sm) - 2px);
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.78rem;
		font-weight: 450;
		font-family: inherit;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-apple);
		position: relative;
	}

	.segment--active {
		background: rgba(255, 255, 255, 0.12);
		color: var(--text-primary);
		box-shadow:
			0 0.5px 2px rgba(0, 0, 0, 0.2),
			0 0 0 0.5px rgba(255, 255, 255, 0.08);
	}

	.segment:not(.segment--active):hover {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-primary);
	}

	.segment:active {
		transform: scale(0.96);
	}

	/* ─── Dropzone ─── */
	.dropzone {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 110px;
		border: 1.5px dashed rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.02);
		cursor: pointer;
		transition: all var(--duration-normal) var(--ease-apple);
		position: relative;
	}

	.dropzone__input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		z-index: 2;
	}

	.dropzone:hover {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.04);
	}

	.dropzone--hover {
		border-color: var(--accent) !important;
		border-style: solid !important;
		background: var(--accent-soft) !important;
		transform: scale(1.01);
	}

	.dropzone--loaded {
		border-style: solid;
		border-color: rgba(48, 209, 88, 0.25);
		background: var(--success-soft);
	}

	.dropzone__idle {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}

	.dropzone__icon-ring {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-tertiary);
		transition: all var(--duration-fast) var(--ease-apple);
	}

	.dropzone:hover .dropzone__icon-ring {
		background: var(--accent-soft);
		color: var(--accent);
	}

	.dropzone__text {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.dropzone__hint {
		font-size: 0.6875rem;
		color: var(--text-quaternary);
	}

	.dropzone__success {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}

	.dropzone__check {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(48, 209, 88, 0.15);
		color: var(--success);
	}

	.dropzone__file {
		font-size: 0.78rem;
		color: var(--text-primary);
		font-weight: 450;
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

    /* ─── Strava Import ─── */
	.strava-import {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.apple-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.04);
		border: 0.5px solid rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		padding: 0.6rem 0.75rem;
		font-size: 0.8125rem;
		font-family: inherit;
		outline: none;
		transition: all var(--duration-fast) var(--ease-apple);
	}
	.apple-input:focus {
		border-color: var(--accent);
		background: rgba(255, 255, 255, 0.08);
	}
	.apple-input::placeholder {
		color: var(--text-quaternary);
	}

	.tutorial-steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: var(--radius-sm);
		border: 0.5px solid rgba(255, 255, 255, 0.04);
	}

	.step {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		font-size: 0.6rem;
		font-weight: 600;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.step a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.step a:hover {
		color: #3aa0ff;
	}

    /* ─── Playback Controls ─── */
    .playback-controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    .btn-primary, .btn-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.625rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-apple);
        border: none;
    }

    .btn-primary {
        background: #FF3B30; /* Apple red */
        color: white;
    }

    .btn-primary:hover:not(:disabled) {
        background: #FF453A;
    }

    .btn-primary:active:not(:disabled) {
        transform: scale(0.98);
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
    }

    .btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
    }

    .btn-secondary:active:not(:disabled) {
        transform: scale(0.98);
    }

    .btn-primary:disabled, .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .recording-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: white;
    }

	/* ─── Advanced Toggle ─── */
	.advanced-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		-webkit-tap-highlight-color: transparent;
	}

	.advanced-toggle__chevron {
		color: var(--text-tertiary);
		transition: transform var(--duration-normal) var(--ease-apple);
	}

	.advanced-toggle__chevron--open {
		transform: rotate(180deg);
	}

	/* ─── Advanced Panel ─── */
	.advanced-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: slideDown 0.3s var(--ease-apple) both;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ─── Param Groups ─── */
	.param-group {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: var(--radius-sm);
		border: 0.5px solid rgba(255, 255, 255, 0.04);
	}

	.param-group__label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-quaternary);
	}

	/* ─── Slider Field ─── */
	.slider-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.slider-field__header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.slider-field__label {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-weight: 400;
	}

	.slider-field__value {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		min-width: 2.5rem;
		text-align: right;
	}

	/* ─── Apple-Style Slider ─── */
	.apple-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.1);
		outline: none;
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-apple);
	}

	.apple-slider:hover {
		background: rgba(255, 255, 255, 0.14);
	}

	.apple-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #ffffff;
		border: none;
		box-shadow:
			0 0.5px 1px rgba(0, 0, 0, 0.3),
			0 1px 4px rgba(0, 0, 0, 0.2),
			0 0 0 0.5px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		transition: transform var(--duration-fast) var(--ease-spring);
	}

	.apple-slider::-webkit-slider-thumb:hover {
		transform: scale(1.12);
	}

	.apple-slider::-webkit-slider-thumb:active {
		transform: scale(1.05);
		box-shadow:
			0 0.5px 1px rgba(0, 0, 0, 0.3),
			0 1px 4px rgba(0, 0, 0, 0.2),
			0 0 0 0.5px rgba(0, 0, 0, 0.1),
			0 0 0 4px rgba(10, 132, 255, 0.2);
	}

	.apple-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #ffffff;
		border: none;
		box-shadow:
			0 0.5px 1px rgba(0, 0, 0, 0.3),
			0 1px 4px rgba(0, 0, 0, 0.2);
		cursor: pointer;
	}

	/* ─── Toggle Field ─── */
	.toggle-field {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.toggle-field__label {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-weight: 400;
	}

	/* ─── Apple Toggle Switch ─── */
	.apple-toggle {
		position: relative;
		width: 42px;
		height: 26px;
		border-radius: 13px;
		border: none;
		background: rgba(255, 255, 255, 0.15);
		cursor: pointer;
		padding: 0;
		transition: background var(--duration-normal) var(--ease-apple);
		flex-shrink: 0;
	}

	.apple-toggle--on {
		background: var(--accent);
	}

	.apple-toggle__knob {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ffffff;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.2),
			0 0 0 0.5px rgba(0, 0, 0, 0.05);
		transition: transform var(--duration-normal) var(--ease-apple);
	}

	.apple-toggle--on .apple-toggle__knob {
		transform: translateX(16px);
	}

	/* ─── Reset Button ─── */
	.reset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 0.5px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-tertiary);
		font-size: 0.75rem;
		font-family: inherit;
		font-weight: 450;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-apple);
	}

	.reset-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-secondary);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.reset-btn:active {
		transform: scale(0.97);
	}

	/* ─── Info Pill ─── */
	.info-pill {
		margin-top: auto;
		padding-top: 1rem;
		display: flex;
		justify-content: center;
	}

	.info-pill span {
		display: inline-flex;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 0.5px solid rgba(255, 255, 255, 0.06);
		border-radius: var(--radius-pill);
		font-size: 0.6875rem;
		color: var(--text-quaternary);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
	}

	/* ─── Preview Area ─── */
	.preview-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.preview-frame {
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: rgba(0, 0, 0, 0.4);
		box-shadow: var(--shadow-float);
		border: 0.5px solid rgba(255, 255, 255, 0.06);
	}

    .preview-canvas {
        transform-origin: top left;
        position: relative;
    }

    .map {
        width: 100%;
        height: 100%;
    }

    /* ─── Overlays ─── */
    .countdown-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: white;
        font-size: 8rem;
        font-weight: 700;
        z-index: 10;
        text-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }

    .recording-indicator {
        position: absolute;
        top: 2rem;
        left: 2rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-pill);
        color: white;
        font-size: 0.8125rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        z-index: 10;
    }

    .recording-dot--pulse {
        background-color: #FF3B30;
        animation: recPulse 1.5s infinite ease-in-out;
    }

    @keyframes recPulse {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
    }

	/* ─── Responsive ─── */
	@media (max-width: 768px) {
		.studio {
			flex-direction: column;
			height: auto;
		}

		.sidebar {
			width: 100%;
			min-width: unset;
		}

		.preview-area {
			min-height: 50vh;
		}
	}

	/* ─── MapLibre Control Overrides — BIG + Apple Glass ─── */
	:global(.maplibregl-ctrl-group) {
		background: rgba(44, 44, 46, 0.75) !important;
		backdrop-filter: blur(24px) saturate(160%) !important;
		-webkit-backdrop-filter: blur(24px) saturate(160%) !important;
		border: 0.5px solid rgba(255, 255, 255, 0.12) !important;
		border-radius: 14px !important;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.25),
			0 8px 24px rgba(0, 0, 0, 0.15) !important;
		overflow: hidden !important;
	}

	:global(.maplibregl-ctrl-group button) {
		background: transparent !important;
		border-color: rgba(255, 255, 255, 0.06) !important;
		width: 48px !important;
		height: 48px !important;
		transition: background 0.15s ease !important;
	}

	:global(.maplibregl-ctrl-group button:hover) {
		background: rgba(255, 255, 255, 0.1) !important;
	}

	:global(.maplibregl-ctrl-group button:active) {
		background: rgba(255, 255, 255, 0.16) !important;
	}

	:global(.maplibregl-ctrl-group button .maplibregl-ctrl-icon) {
		filter: invert(1) brightness(0.85);
		width: 22px !important;
		height: 22px !important;
	}

	:global(.maplibregl-ctrl-attrib) {
		background: rgba(44, 44, 46, 0.6) !important;
		backdrop-filter: blur(12px) !important;
		-webkit-backdrop-filter: blur(12px) !important;
		border-radius: 8px !important;
		font-size: 0.6875rem !important;
		padding: 2px 8px !important;
	}

	:global(.maplibregl-ctrl-attrib a) {
		color: var(--text-tertiary) !important;
	}
</style>