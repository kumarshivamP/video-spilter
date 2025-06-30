// src/App.jsx
import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./App.css";

const App = () => {
  const [video, setVideo] = useState(null);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zipBlob, setZipBlob] = useState(null);
  const [error, setError] = useState(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const videoRef = useRef(null);
  const ffmpegRef = useRef(null);

  // Load FFmpeg when component mounts
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const FFmpegModule = await import("@ffmpeg/ffmpeg");
        const FFmpeg = FFmpegModule.FFmpeg || FFmpegModule.default.FFmpeg;
        ffmpegRef.current = new FFmpeg();
        ffmpegRef.current.log = true;

        await ffmpegRef.current.load();
        setFfmpegLoaded(true);
      } catch (err) {
        console.error("Failed to load FFmpeg:", err);
        setError("Failed to load video processor. Please try refreshing the page.");
      }
    };

    if (!ffmpegRef.current) {
      loadFFmpeg();
    }
  }, []);

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, MOV, AVI, etc.)");
      return;
    }

    setVideo(file);
    setError(null);
    setZipBlob(null);

    // Create a preview
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load(); // Ensure video loads properly
    }
  };

  const handleProcess = async () => {
    try {
      if (!video || !duration) return;
      if (!ffmpegRef.current || !ffmpegLoaded) {
        setError("Video processor is still loading. Please wait...");
        return;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      const ffmpeg = ffmpegRef.current;
      console.log("🚀 ~ handleProcess ~ ffmpeg:", ffmpeg);

      // Create a clean, safe filename
      const rawName = video.name.replace(/\.[^/.]+$/, "");
      const safeName = rawName.replace(/[^\w\-]/g, "_");
      const inputFileName = `${safeName}.mp4`;
      console.log("🚀 ~ handleProcess ~ fileName:", safeName);

      // Write the input file
      const arrayBuffer = await video.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      setProgress(5);
      await ffmpeg.writeFile(inputFileName, uint8Array);

      // Get duration
      const videoEl = document.createElement("video");
      videoEl.src = URL.createObjectURL(video);
      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = resolve;
        videoEl.onerror = reject;
        setTimeout(() => reject(new Error("Video metadata loading timed out")), 5000);
      });
      const totalDuration = videoEl.duration;
      console.log("🚀 ~ handleProcess ~ totalDuration:", totalDuration)
      URL.revokeObjectURL(videoEl.src);

      if (!totalDuration || isNaN(totalDuration)) {
        throw new Error("Could not determine video duration");
      }

      setProgress(10);

      const zip = new JSZip();
      let part = 0;
      const totalParts = Math.ceil(totalDuration / duration);
      console.log("🚀 ~ handleProcess ~ totalParts:", totalParts)
      try {
        for (let start = 0; start < totalDuration; start += Number(duration)) {
          const output = `part${++part}.mp4`;

          console.log("🚀 ~ handleProcess ~ output:", output)
          await ffmpeg.exec([
            "-i", inputFileName,
            "-ss", `${start}`,
            "-t", `${duration}`,
            "-c", "copy",
            output
          ]);

          const data = await ffmpeg.readFile(output);
          console.log("🚀 ~ handleProcess ~ data:", data)
          zip.file(`${safeName}_part${part}.mp4`, data);
          await ffmpeg.deleteFile(output);

          const currentProgress = 10 + Math.round((part / totalParts) * 85);
          setProgress(currentProgress);
        }
      } catch (error) {
        console.error(error);
      }

      await ffmpeg.deleteFile(inputFileName);
      setProgress(95);
      const blob = await zip.generateAsync({ type: "blob" });
      console.log("🚀 ~ handleProcess ~ blob:", blob)
      setProgress(100);
      setZipBlob(blob);

    } catch (err) {
      console.error("Processing error:", err);
      setError(`Failed to process video: ${err.message || "Please try a different file or shorter duration."}`);
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setVideo(null);
    setZipBlob(null);
    setDuration(30);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.src = "";
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>🎬 Video Splitter</h1>
          <p>Split large videos into smaller segments</p>
          {!ffmpegLoaded && (
            <div className="init-loader">
              <div className="spinner"></div>
              <p>Initializing video processor...</p>
            </div>
          )}
        </header>

        {!video ? (
          <div className="upload-section">
            <div
              className="drop-area"
              onClick={() => document.getElementById("file-input").click()}
            >
              <div className="icon">📁</div>
              <p>Click to upload a video file</p>
              <p className="subtext">Supports MP4, MOV, AVI, and other common formats</p>
            </div>
            <input
              id="file-input"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              style={{ display: "none" }}
            />
          </div>
        ) : (
          <div className="preview-section">
            <div className="video-preview">
              <video
                ref={videoRef}
                controls
                muted
                onLoadedData={() => console.log("Video loaded")}
                onError={(e) => console.error("Video error", e)}
              />
              <div className="video-info">
                <h3>{video.name}</h3>
                <p>{(video.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>

            <div className="controls">
              <div className="duration-control">
                <label>Split duration (seconds):</label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  disabled={loading || !ffmpegLoaded}
                />
              </div>

              {!loading && !zipBlob && (
                <div className="actions">
                  <button
                    className="process-btn"
                    onClick={handleProcess}
                    disabled={!ffmpegLoaded}
                  >
                    {ffmpegLoaded ? "Split Video" : "Loading Processor..."}
                  </button>
                  <button className="reset-btn" onClick={resetForm}>
                    Change Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {loading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }}></div>
            </div>
            <p>Splitting video... {progress}%</p>
            <p className="note">This may take several minutes for large videos</p>
          </div>
        )}

        {zipBlob && (
          <div className="result-section">
            <div className="success-message">
              <div className="success-icon">✅</div>
              <h3>Video Successfully Split!</h3>
              <p>Your video has been split into segments. Click below to download.</p>
            </div>
            <div className="download-actions">
              <button
                className="download-btn"
                onClick={() => saveAs(zipBlob, "video_segments.zip")}
              >
                ⬇️ Download All Segments
              </button>
              <button className="another-btn" onClick={resetForm}>
                🔁 Split Another Video
              </button>
            </div>
          </div>
        )}

        <footer>
          <p>Made with React and FFmpeg.wasm</p>
          <p>Note: Video processing happens entirely in your browser</p>
        </footer>
      </div>
    </div>
  );
};

export default App;