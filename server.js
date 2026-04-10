const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ✅ FIX: serve files from root (NO public folder)
app.use(express.static(__dirname));

let locations = [];

app.post('/location', (req, res) => {
  const loc = req.body;

  if (typeof loc?.lat !== 'number' || typeof loc?.lon !== 'number') {
    return res.status(400).json({ error: "Invalid location data" });
  }

  locations.push({
    lat: loc.lat,
    lon: loc.lon,
    reqId: loc.reqId || "unknown",
    time: new Date().toISOString()
  });

  console.log("Received:", loc);
  res.sendStatus(200);
});

app.get('/locations', (req, res) => {
  res.json(locations);
});

app.get('/', (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});
