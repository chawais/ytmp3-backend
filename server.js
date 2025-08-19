const express = require("express");
const youtubedl = require("yt-dlp-exec"); // or "youtube-dl-exec" if that's what installed
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Route: Convert YouTube to MP3
app.get("/downloadmp3", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("No URL provided");

  try {
    res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

    const proc = youtubedl.exec(url, {
      output: "-",
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: "0" // best
    });

    proc.stdout.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing video");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
