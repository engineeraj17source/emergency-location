const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const SECRET = "supersecretkey"; // move to .env later

let locations = [];

// ✅ tracking state
let activeUsers = new Set();
let stoppedUsers = new Set();


// 🔐 AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.reqId = decoded.reqId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}


// 🔗 GENERATE SECURE LINK (NEW)
app.get('/generate', (req, res) => {
  const reqId = "REQ_" + Math.floor(Math.random() * 10000);

  const token = jwt.sign(
    { reqId },
    SECRET,
    { expiresIn: "30m" } // ⏳ expiry
  );

  const link = `${req.protocol}://${req.get('host')}?token=${token}`;

  res.json({ link, reqId });
});


// 📍 LOCATION API
app.post('/location', auth, (req, res) => {
  const loc = req.body;
  const reqId = req.reqId;

  const isManual = loc.manual === true;
  const source = loc.source || "USER";

  if (!isManual && stoppedUsers.has(reqId)) {
    console.log("⛔ Ignored (STOPPED):", reqId);
    return res.status(403).json({ error: "Tracking stopped" });
  }

  if (!isManual && !activeUsers.has(reqId)) {
    console.log("⛔ Ignored (NOT ACTIVE):", reqId);
    return res.status(403).json({ error: "Tracking not active" });
  }

  if (typeof loc?.lat !== 'number' || typeof loc?.lon !== 'number') {
    return res.status(400).json({ error: "Invalid location data" });
  }

  locations.push({
    lat: loc.lat,
    lon: loc.lon,
    reqId,
    type: isManual ? "MANUAL" : "GPS",
    source,
    time: new Date().toISOString()
  });

  console.log(isManual ? "✍️ MANUAL:" : "📍 GPS:", reqId);

  res.sendStatus(200);
});


// 🟢 START TRACKING
app.post('/start', auth, (req, res) => {
  const reqId = req.reqId;

  activeUsers.add(reqId);
  stoppedUsers.delete(reqId);

  console.log("🟢 START:", reqId);

  res.sendStatus(200);
});


// 🔴 STOP TRACKING
app.post('/stop', auth, (req, res) => {
  const reqId = req.reqId;

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


// 📊 FETCH LOCATIONS
app.get('/locations', (req, res) => {
  res.json(locations);
});


// ❤️ HEALTH CHECK
app.get('/', (req, res) => {
  res.sendFile(__dirname + "/index.html");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});
