// server.js
const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core"); // ✅ switched to main ytdl-core
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS (allow all or restrict to your frontend domain)
app.use(cors({ origin: "*" }));

// Make sure ffmpeg-static is used
ffmpeg.setFfmpegPath(ffmpegPath);

// Health check
app.get("/", (req, res) => {
  res.send("✅ YTMP3 Backend is running!");
});

// /downloadmp3?url=<YouTube URL>
app.get("/downloadmp3", async (req, res) => {
  const url = req.query.url;

  // 1) Validate input
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).send("Invalid or missing YouTube URL");
  }

  try {
    // 2) Basic info & filename
    const info = await ytdl.getBasicInfo(url);
    const isLive = info.videoDetails.isLive;
    if (isLive) return res.status(400).send("Live streams are not supported");

    const rawTitle = info.videoDetails.title || "audio";
    const safeTitle = rawTitle.replace(/[^\w\s-]/g, "_").trim().slice(0, 80) || "audio";

    // 3) Headers for download
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
    res.setHeader("Cache-Control", "no-store");

    // 4) Stream: YouTube (audio only) -> ffmpeg -> client
    const audioStream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
      requestOptions: { // ✅ add headers to avoid 429
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9"
        }
      }
    });

    audioStream.on("error", (err) => {
      console.error("ytdl error:", err?.message || err);
      if (!res.headersSent) {
        if (err.statusCode === 429) {
          res.status(429).send("YouTube rate limit reached. Please try again later.");
        } else {
          res.status(500).send("Error fetching audio stream");
        }
      }
    });

    ffmpeg(audioStream)
      .audioBitrate(192) // good balance
      .format("mp3")
      .on("error", (err) => {
        console.error("FFmpeg error:", err?.message || err);
        if (!res.headersSent) res.status(500).send("Error processing video");
      })
      .pipe(res, { end: true });

  } catch (err) {
    console.error("Download error:", err?.message || err);
    if (!res.headersSent) res.status(500).send("Error processing video");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
