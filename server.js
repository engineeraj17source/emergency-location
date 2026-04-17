require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const SECRET = process.env.JWT_SECRET || "supersecretkey";

// 🔌 MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ DB error:", err));


// 🧱 SCHEMAS
const locationSchema = new mongoose.Schema({
  reqId: String,
  lat: Number,
  lon: Number,
  type: String,
  source: String,
  event: String,
  time: { type: Date, default: Date.now }
});

// 📊 INDEX (STEP 4)
locationSchema.index({ reqId: 1, time: -1 });

const Location = mongoose.model('Location', locationSchema);

const sessionSchema = new mongoose.Schema({
  reqId: { type: String, unique: true },
  active: { type: Boolean, default: false },
  stopped: { type: Boolean, default: false }
});

const Session = mongoose.model('Session', sessionSchema);


// 🔐 AUTH MIDDLEWARE (STEP 3 UPDATED)
async function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    const session = await Session.findOne({ reqId: decoded.reqId });

    if (!session) {
      return res.status(403).json({ error: "Session not found" });
    }

    req.reqId = decoded.reqId;
    next();

  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}


// 🔗 GENERATE SECURE LINK (STEP 2 UPDATED)
app.get('/generate', async (req, res) => {
  const reqId = "REQ_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  await Session.create({ reqId });

  const token = jwt.sign({ reqId }, SECRET, { expiresIn: "30m" });

  const link = `${req.protocol}://${req.get('host')}?token=${token}`;

  res.json({ link, reqId });
});


// 📍 LOCATION API
app.post('/location', auth, async (req, res) => {
  const loc = req.body;
  const reqId = req.reqId;

  const isManual = loc.manual === true;
  const source = loc.source || "USER";

  const session = await Session.findOne({ reqId });

  if (!isManual && session?.stopped) {
    console.log("⛔ Ignored (STOPPED):", reqId);
    return res.status(403).json({ error: "Tracking stopped" });
  }

  if (!isManual && !session?.active) {
    console.log("⛔ Ignored (NOT ACTIVE):", reqId);
    return res.status(403).json({ error: "Tracking not active" });
  }

  if (
    typeof loc?.lat !== 'number' ||
    typeof loc?.lon !== 'number'
  ) {
    return res.status(400).json({ error: "Invalid location data" });
  }

  await Location.create({
    lat: loc.lat,
    lon: loc.lon,
    reqId,
    type: isManual ? "MANUAL" : "GPS",
    source
  });

  console.log(isManual ? "✍️ MANUAL:" : "📍 GPS:", reqId);

  res.sendStatus(200);
});


// 🟢 START TRACKING
app.post('/start', auth, async (req, res) => {
  const reqId = req.reqId;

  await Session.findOneAndUpdate(
    { reqId },
    { active: true, stopped: false }
  );

  console.log("🟢 START:", reqId);

  res.sendStatus(200);
});


// 🔴 STOP TRACKING
app.post('/stop', auth, async (req, res) => {
  const reqId = req.reqId;

  await Session.findOneAndUpdate(
    { reqId },
    { active: false, stopped: true }
  );

  await Location.create({
    reqId,
    event: "DISCONNECTED"
  });

  console.log("🔴 STOP:", reqId);

  res.sendStatus(200);
});


// 📊 FETCH LOCATIONS (SECURED)
app.get('/locations', auth, async (req, res) => {
  const data = await Location.find({ reqId: req.reqId })
    .sort({ time: -1 });

  res.json(data);
});


// ❤️ HEALTH CHECK
app.get('/', (req, res) => {
  res.sendFile(__dirname + "/index.html");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on", PORT);
});
