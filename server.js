const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend (dashboard + index.html inside /public)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (resets when server restarts)
let locations = [];

// Receive location from phone
app.post('/location', (req, res) => {
  const loc = req.body;

  if (!loc || !loc.lat || !loc.lon) {
    return res.status(400).json({ error: "Invalid location data" });
  }

  locations.push({
    ...loc,
    time: new Date().toISOString()
  });

  console.log("Received:", loc);
  res.sendStatus(200);
});

// Send all locations to dashboard
app.get('/locations', (req, res) => {
  res.json(locations);
});

// Health check (useful for debugging phone access)
app.get('/', (req, res) => {
  res.send("Server is running");
});

// IMPORTANT: bind to all network interfaces
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});