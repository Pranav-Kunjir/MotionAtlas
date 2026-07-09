import * as toGeoJSON from "@mapbox/togeojson";

export async function parseGPX(file: File) {
    if (!file) {
        console.error("No file passed");
        return;
    }

    const text = await file.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const geojson = toGeoJSON.gpx(xml);
    console.log(geojson)
    return geojson;
}