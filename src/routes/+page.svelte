<script lang="ts">
    import Map from "$lib/components/maplibre-gl.svelte"
	let name = "MotionAtlas";
</script>
<h1>{name}</h1>
<p>Your Strava video generator.</p>
<div class="h-screen">
    <Map />
</div>
