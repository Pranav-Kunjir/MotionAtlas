import maplibregl from 'maplibre-gl'
import { parseGPX } from '$lib/functions/convertgpx';
import record from '$lib/map/recorder'
export async function replay(map:maplibregl.Map,file:File){
    if (!file) return;
    const canvas = map.getCanvas();
    const stream = canvas.captureStream(60); // 60 FPS
    const recorder = record(stream)
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
        chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, {
            type: "video/webm"
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "route.webm";
        a.click();
    };

    const geojson = await parseGPX(file);

    console.log(geojson);

    if (map.getLayer("route")) {
        map.removeLayer("route");
    }

    if (map.getSource("route")) {
        map.removeSource("route");
    }

    map.addSource("route", {
        type: "geojson",
        data: geojson
    });
    const feature = geojson.features[0];
    if (!feature || feature.geometry.type !== "LineString") return;
    const coords = feature.geometry.coordinates;
    const bounds = new maplibregl.LngLatBounds();
    for (const coord of coords) {
        bounds.extend([coord[0], coord[1]]);
    }
    map.fitBounds(bounds, {
        padding: 50
    });
    const point = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: coords[0]
                },
                properties: {}
            }
        ]
    };
    const completed = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: [coords[0]]
        },
        properties: {}
    };

    if (map.getLayer("runner")) map.removeLayer("runner");
    if (map.getSource("runner")) map.removeSource("runner");

    if (map.getLayer("completed")) map.removeLayer("completed");
    if (map.getSource("completed")) map.removeSource("completed");

    map.addSource("runner", {
        type: "geojson",
        data: point
    });

    map.addSource("completed", {
        type: "geojson",
        data: completed
    });

    map.addLayer({
        id: "completed",
        type: "line",
        source: "completed",
        paint: {
            "line-color": "#FC5200",
            "line-width": 8
        }
    });

    map.addLayer({
        id: "runner",
        type: "circle",
        source: "runner",
        paint: {
            "circle-radius": 8,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#FC5200",
            "circle-stroke-width": 3
        }
    });

    let i = 0;
    recorder.start()
    function animate() {
        if (i >= coords.length) {
            recorder.stop()
            return
        };

        point.features[0].geometry.coordinates = coords[i];

        (map.getSource("runner") as maplibregl.GeoJSONSource).setData(point);

        completed.geometry.coordinates.push(coords[i]);

        (map.getSource("completed") as maplibregl.GeoJSONSource).setData(completed);
        map.easeTo({
            center: [coords[i][0], coords[i][1]],
            duration: 0,
            zoom: 16,
            pitch: 60
        });

        i += 10;

        requestAnimationFrame(animate);
    }

    animate();
    map.triggerRepaint();
    console.log("Layer:", map.getLayer("route"));
    console.log("Source:", map.getSource("route"));
}