require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Mongoose models
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  display_name: String,
  email: { type: String, unique: true, sparse: true },
  phone: String,
  password: String,
  role: { type: String, enum: ['user','admin'], default: 'user' },
  login_method: { type: String, enum: ['manual','google_oauth','google_onetap'], default: 'manual' },
  created_at: { type: Date, default: Date.now },
  last_login_at: Date
});
const linkSchema = new mongoose.Schema({
  url: String,
  type: { type: String, enum: ['youtube','website','product'], default: 'website' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_admin_pinned: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
const historySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  link_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Link' },
  viewed_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);
const Link = mongoose.model('Link', linkSchema);
const UserHistory = mongoose.model('UserHistory', historySchema);

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('✅ MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// Ensure single admin user exists
async function ensureAdmin(){
  try{
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if(!adminUsername || !adminPassword) return;
    let admin = await User.findOne({ username: adminUsername });
    if(!admin){
      const hash = await bcrypt.hash(adminPassword, 10);
      admin = new User({ username: adminUsername, display_name: 'Admin', password: hash, role: 'admin' });
      await admin.save();
      console.log('✅ Admin user created:', adminUsername);
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  }catch(err){ console.error('Admin creation error', err); }
}
ensureAdmin();

// Helper auth middleware
function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).send({ error: 'no token' });
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).send({ error: 'bad token' });
  try{
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.userId = payload.id;
    next();
  }catch(e){
    return res.status(401).send({ error: 'invalid token' });
  }
}

app.get('/api/ping', (req,res)=> res.send({ ok:true }));

// Signup
app.post('/api/auth/signup', async (req,res)=>{
  try{
    const { email, phone, displayName, username, password } = req.body;
    // create user (no password is required for fast signup if using only phone/email)
    let existing = null;
    if(email) existing = await User.findOne({ email });
    if(existing) return res.status(400).send({ error: 'user exists' });
    const hash = password ? await bcrypt.hash(password, 10) : undefined;
    const user = new User({ email, phone, display_name: displayName || email || username, username, password: hash });
    await user.save();
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.send({ token, user });
  }catch(err){ console.error(err); res.status(500).send({ error: 'signup failed' }); }
});

// Login
app.post('/api/auth/login', async (req,res)=>{
  try{
    const { username, email, phone, password } = req.body;
    let user = null;
    if(username) user = await User.findOne({ username });
    if(!user && email) user = await User.findOne({ email });
    if(!user && phone) user = await User.findOne({ phone });
    if(!user) return res.status(404).send({ error: 'user not found' });
    if(user.password){
      const ok = await bcrypt.compare(password || '', user.password);
      if(!ok) return res.status(401).send({ error: 'invalid credentials' });
    }
    user.last_login_at = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.send({ token, user });
  }catch(err){ console.error(err); res.status(500).send({ error: 'login failed' }); }
});

// Create link
app.post('/api/links', authMiddleware, async (req,res)=>{
  try{
    const user = await User.findById(req.userId);
    const { url, type } = req.body;
    const link = new Link({ url, type, uploaded_by: user ? user._id : undefined });
    await link.save();
    res.send({ ok:true, link });
  }catch(err){ console.error(err); res.status(500).send({ error: 'upload failed' }); }
});

// Next link logic
app.get('/api/links/next', authMiddleware, async (req,res)=>{
  try{
    const seen = await UserHistory.find({ user_id: req.userId }).select('link_id').lean();
    const seenIds = seen.map(s=>s.link_id.toString());
    // admin pinned first
    let next = await Link.findOne({ _id: { $nin: seenIds }, is_admin_pinned: true }).sort({ created_at: -1 }).lean();
    if(next){
      await UserHistory.create({ user_id: req.userId, link_id: next._id });
      return res.send({ link: next });
    }
    // find next not uploaded by this user
    next = await Link.findOne({ _id: { $nin: seenIds }, $or: [ { uploaded_by: { $exists: false } }, { uploaded_by: { $ne: req.userId } } ] }).sort({ created_at: -1 }).lean();
    if(!next) return res.send({ link: null });
    await UserHistory.create({ user_id: req.userId, link_id: next._id });
    res.send({ link: next });
  }catch(err){ console.error(err); res.status(500).send({ error: 'next link failed' }); }
});

// Admin stats (simple)
app.get('/api/admin/login-stats', authMiddleware, async (req,res)=>{
  try{
    const user = await User.findById(req.userId);
    if(!user || user.role !== 'admin') return res.status(403).send({ error: 'only admin' });
    const manual = await User.countDocuments({ login_method: 'manual' });
    const google = await User.countDocuments({ login_method: 'google_oauth' });
    const onetap = await User.countDocuments({ login_method: 'google_onetap' });
    res.send({ manual, google, onetap });
  }catch(err){ console.error(err); res.status(500).send({ error: 'stats failed' }); }
});

app.listen(PORT, ()=> console.log('Server running on port', PORT));
