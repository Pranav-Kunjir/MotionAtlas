export default function record(stream:MediaStream){
    const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 30_000_000
    });
    return(recorder)
}