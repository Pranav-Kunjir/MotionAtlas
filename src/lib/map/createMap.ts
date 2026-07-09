import maplibregl from "maplibre-gl";
import type { ReplaySettings } from "$lib/defaults";

export function createMap(mapContainer:HTMLDivElement,settings:ReplaySettings){
    	const map = new maplibregl.Map({
			container: mapContainer,
			// style: "https://demotiles.maplibre.org/style.json",
            pitch: settings.pitch,
            hash: true,
            center: [73.8567, 18.5204],
            zoom :  settings.zoom,
            style: {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                // tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tiles: ['https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                            'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                            'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                            'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
                tileSize: 256,
                attribution: '&copy; OpenStreetMap Contributors',
                maxzoom: 19
            },
            // Use a different source for terrain and hillshade layers, to improve render quality
            terrainSource: {
                type: 'raster-dem',
                url: 'https://tiles.mapterhorn.com/tilejson.json'
            },
            hillshadeSource: {
                type: 'raster-dem',
                url: 'https://tiles.mapterhorn.com/tilejson.json'
            }
        },
        layers: [
            {
                id: 'osm',
                type: 'raster',
                source: 'osm'
            },
            {
                id: 'hills',
                type: 'hillshade',
                source: 'hillshadeSource',
                layout: {visibility: 'visible'},
                paint: {'hillshade-shadow-color': '#473B24'}
            }
        ],
        terrain: {
            source: 'terrainSource',
            exaggeration: 2
        },
        sky: {}
        },
        maxZoom: 18,
        maxPitch: 85
		});
    return(map)
}