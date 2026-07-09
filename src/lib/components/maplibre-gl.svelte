<script lang="ts">
	import { onMount } from "svelte";
	import maplibregl from "maplibre-gl";
    import { createMap } from "$lib/map/createMap";
	import { replay } from "$lib/map/replay";
	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;
	onMount(() => {
        map = createMap(mapContainer)
        map.addControl(
            new maplibregl.NavigationControl({
                showCompass: true,
                showZoom: true,
                visualizePitch: true
            }),
            "top-right"
        );
		map.on("load", () => {
			console.log("Map Loaded");
		});

		return () => map.remove();
	});
</script>

<div bind:this={mapContainer} style="height:1200px; width:720px"></div>


<input
    type="file"
    accept=".gpx"
    onchange={async (e) => {
        const file = (e.currentTarget as HTMLInputElement).files?.[0];

        if (!file || !map) return;

        await replay(map, file);
    }}
/>