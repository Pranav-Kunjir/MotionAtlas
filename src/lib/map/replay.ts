import maplibregl from 'maplibre-gl'
import { parseGPX } from '$lib/functions/convertgpx';
import record from '$lib/map/recorder'
import type { ReplaySettings } from "$lib/defaults";
import type {
    Feature,
    FeatureCollection,
    LineString,
    Point
} from "geojson";
export class RouteAnimator {
    map: maplibregl.Map;
    settings: ReplaySettings;
    coords: number[][];
    recorder: MediaRecorder | null = null;
    isRecording: boolean = false;
    isAnimating: boolean = false;
    onComplete: () => void = () => {};
    point!: FeatureCollection<Point>;
    completed!: Feature<LineString>;
    animationFrameId: number = 0;

    constructor(map: maplibregl.Map, settings: ReplaySettings) {
        this.map = map;
        this.settings = settings;
        this.coords = [];
    }

    async loadFile(file: File) {
        const geojson = await parseGPX(file);
        
        if (this.map.getLayer("route")) this.map.removeLayer("route");
        if (this.map.getSource("route")) this.map.removeSource("route");

        this.map.addSource("route", {
            type: "geojson",
            data: geojson
        });
        const feature = geojson.features[0];
        if (!feature || feature.geometry.type !== "LineString") return;
        this.coords = feature.geometry.coordinates;
        const bounds = new maplibregl.LngLatBounds();
        for (const coord of this.coords) {
            bounds.extend([coord[0], coord[1]]);
        }
        this.map.fitBounds(bounds, {
            padding: 50
        });

        this.point = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: this.coords[0]
                    },
                    properties: {}
                }
            ]
        };
        this.completed = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [this.coords[0]]
            },
            properties: {}
        };

        if (this.map.getLayer("runner")) this.map.removeLayer("runner");
        if (this.map.getSource("runner")) this.map.removeSource("runner");
        if (this.map.getLayer("completed")) this.map.removeLayer("completed");
        if (this.map.getSource("completed")) this.map.removeSource("completed");

        this.map.addSource("runner", { type: "geojson", data: this.point });
        this.map.addSource("completed", { type: "geojson", data: this.completed });

        this.map.addLayer({
            id: "completed",
            type: "line",
            source: "completed",
            paint: {
                "line-color": "#FC5200",
                "line-width": this.settings.lineWidth
            }
        });

        this.map.addLayer({
            id: "runner",
            type: "circle",
            source: "runner",
            paint: {
                "circle-radius": this.settings.runnerRadius,
                "circle-color": "#ffffff",
                "circle-stroke-color": "#FC5200",
                "circle-stroke-width": 3
            }
        });
    }

    start(recordVideo: boolean = false) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Reset geometry to start
        this.point.features[0].geometry.coordinates = this.coords[0];
        this.completed.geometry.coordinates = [this.coords[0]];
        
        let i = 0;

        if (recordVideo) {
            this.isRecording = true;
            const canvas = this.map.getCanvas();
            const stream = canvas.captureStream(60);
            this.recorder = record(stream);
            const chunks: Blob[] = [];
            this.recorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };
            this.recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "route.webm";
                a.click();
            };
            this.recorder.start();
        }

        const animate = () => {
            if (i >= this.coords.length) {
                this.stop();
                return;
            }

            this.point.features[0].geometry.coordinates = this.coords[i];
            (this.map.getSource("runner") as maplibregl.GeoJSONSource).setData(this.point);

            this.completed.geometry.coordinates.push(this.coords[i]);
            (this.map.getSource("completed") as maplibregl.GeoJSONSource).setData(this.completed);

            if (this.settings.followRunner) {
                this.map.easeTo({
                    center: [this.coords[i][0], this.coords[i][1]],
                    duration: 0,
                    zoom: this.settings.zoom,
                    pitch: this.settings.pitch,
                    bearing : this.settings.bearing
                });
            }

            i += this.settings.speed;
            this.animationFrameId = requestAnimationFrame(animate);
        };

        animate();
        this.map.triggerRepaint();
    }

    stop() {
        this.isAnimating = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        if (this.isRecording && this.recorder) {
            this.isRecording = false;
            this.recorder.stop();
            this.recorder = null;
        }
        
        this.onComplete();
    }
}