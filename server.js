import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const BROKER_URL = "https://kora-token-broker.onrender.com/token";

// Helper to get a fresh access token
async function getAccessToken() {
  const res = await fetch(BROKER_URL);
  const data = await res.json();
  if (!data.access_token) throw new Error("No access token from broker");
  return data.access_token;
}

// Create playlist
app.post("/create-playlist", async (req, res) => {
  try {
    const { name, description = "Created by KORA" } = req.body;
    const token = await getAccessToken();

    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    const created = await fetch(
      `https://api.spotify.com/v1/users/${me.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description, public: false }),
      }
    ).then(r => r.json());

    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add tracks
app.post("/add-tracks", async (req, res) => {
  try {
    const { playlistId, uris } = req.body;
    const token = await getAccessToken();
    const result = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris }),
      }
    ).then(r => r.json());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Play playlist
app.post("/play", async (req, res) => {
  try {
    const { playlistUri } = req.body;
    const token = await getAccessToken();
    await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ context_uri: playlistUri }),
    });
    res.json({ status: "playing", playlistUri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`KORA Spotify Bridge running on port ${PORT}`);
});

