import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const BROKER_URL = "https://kora-token-broker.onrender.com/token";

// Helper to get a fresh access token from broker
async function getAccessToken() {
  const res = await fetch(BROKER_URL);
  const data = await res.json();
  if (!data.access_token) throw new Error("No access token from broker");
  return data.access_token;
}

// --- SPOTIFY ACTION ROUTES ---

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

// --- LOCAL TOKEN ROUTE ---
app.get("/token", async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ access_token: data.access_token });
  } catch (error) {
    console.error("Token fetch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- SERVER LISTENER ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`KORA Spotify Bridge running on port ${PORT}`);
});
