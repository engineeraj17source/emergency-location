const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// serve files from root
app.use(express.static(__dirname));

let locations = [];

// ✅ TRACKING STATE
let activeUsers = new Set();
let stoppedUsers = new Set();


// 📍 LOCATION RECEIVER (STRICT CONTROL)
app.post('/location', (req, res) => {
  const loc = req.body;

  if (typeof loc?.lat !== 'number' || typeof loc?.lon !== 'number') {
    return res.status(400).json({ error: "Invalid location data" });
  }

  const reqId = loc.reqId || "unknown";

  // ❌ BLOCK if user stopped
  if (stoppedUsers.has(reqId)) {
    console.log("⛔ Ignored (STOPPED):", reqId);
    return res.status(403).json({ error: "Tracking stopped" });
  }

  // ❌ BLOCK if not active
  if (!activeUsers.has(reqId)) {
    console.log("⛔ Ignored (NOT ACTIVE):", reqId);
    return res.status(403).json({ error: "Tracking not active" });
  }

  // ✅ ACCEPT LOCATION
  locations.push({
    lat: loc.lat,
    lon: loc.lon,
    reqId,
    time: new Date().toISOString()
  });

  console.log("📍 Received:", loc);

  res.sendStatus(200);
});


// 🟢 START TRACKING
app.post('/start', (req, res) => {
  const { reqId } = req.body;

  activeUsers.add(reqId);
  stoppedUsers.delete(reqId);

  console.log("🟢 START tracking:", reqId);

  res.sendStatus(200);
});


// 🔴 STOP TRACKING + DISCONNECT EVENT
app.post('/stop', (req, res) => {
  const { reqId } = req.body;

  activeUsers.delete(reqId);
  stoppedUsers.add(reqId);

  // log disconnect event
  locations.push({
    reqId,
    event: "DISCONNECTED",
    time: new Date().toISOString()
  });

  console.log("🔴 STOP tracking:", reqId);

  res.sendStatus(200);
});


// 📊 GET LOCATIONS (dashboard)
app.get('/locations', (req, res) => {
  res.json(locations);
});


// ❤️ HEALTH CHECK
app.get('/', (req, res) => {
  res.send("Server is running");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});
