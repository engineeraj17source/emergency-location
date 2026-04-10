const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let locations = [];

// ✅ tracking state
let activeUsers = new Set();
let stoppedUsers = new Set();


// 📍 LOCATION API (supports GPS + ADMIN manual)
app.post('/location', (req, res) => {
  const loc = req.body;
  const reqId = loc.reqId || "unknown";

  // ❌ block stopped users
  if (stoppedUsers.has(reqId)) {
    console.log("⛔ Ignored (STOPPED):", reqId);
    return res.status(403).json({ error: "Tracking stopped" });
  }

  // ❌ block non-active users
  if (!activeUsers.has(reqId)) {
    console.log("⛔ Ignored (NOT ACTIVE):", reqId);
    return res.status(403).json({ error: "Tracking not active" });
  }

  // validate
  if (typeof loc?.lat !== 'number' || typeof loc?.lon !== 'number') {
    return res.status(400).json({ error: "Invalid location data" });
  }

  const isManual = loc.manual === true;
  const source = loc.source || "USER";

  locations.push({
    lat: loc.lat,
    lon: loc.lon,
    reqId,
    type: isManual ? "MANUAL" : "GPS",
    source: source,
    time: new Date().toISOString()
  });

  console.log(
    isManual ? "✍️ Manual:" : "📍 GPS:",
    reqId
  );

  res.sendStatus(200);
});


// 🟢 START
app.post('/start', (req, res) => {
  const { reqId } = req.body;

  activeUsers.add(reqId);
  stoppedUsers.delete(reqId);

  console.log("🟢 START:", reqId);

  res.sendStatus(200);
});


// 🔴 STOP
app.post('/stop', (req, res) => {
  const { reqId } = req.body;

  activeUsers.delete(reqId);
  stoppedUsers.add(reqId);

  locations.push({
    reqId,
    event: "DISCONNECTED",
    time: new Date().toISOString()
  });

  console.log("🔴 STOP:", reqId);

  res.sendStatus(200);
});


// 📊 FETCH
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
