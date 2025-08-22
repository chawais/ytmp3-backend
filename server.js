const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Health check
app.get("/", (req, res) => {
  res.send("✅ YTMP3 Backend is running!");
});

// Route: Convert YouTube to MP3
app.get("/downloadmp3", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("No URL provided");

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "_");

    res.header("Content-Disposition", `attachment; filename="${title}.mp3"`);

    ffmpeg(ytdl(url, { filter: "audioonly" }))
      .setFfmpegPath(ffmpegPath)
      .audioBitrate(128)
      .toFormat("mp3")
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).send("Error processing video");
      })
      .pipe(res, { end: true });

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("Error processing video");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
