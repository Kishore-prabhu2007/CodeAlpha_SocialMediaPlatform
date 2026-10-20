const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/state - Return users and posts with comments & followers
app.get('/api/state', (req, res) => {
  res.json(readDB());
});

// PUT /api/users/:id - Update user profile
app.put('/api/users/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, handle, bio, avatar } = req.body;
  if (name) user.name = name;
  if (handle) user.handle = handle.startsWith('@') ? handle : `@${handle}`;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;

  writeDB(db);
  res.json(user);
});

// POST /api/users/:id/follow - Toggle follow/unfollow
app.post('/api/users/:id/follow', (req, res) => {
  const targetUserId = req.params.id;
  const { currentUserId } = req.body;
  if (!currentUserId || targetUserId === currentUserId) {
    return res.status(400).json({ error: 'Invalid follow action' });
  }

  const db = readDB();
  const targetUser = db.users.find(u => u.id === targetUserId);
  const currentUser = db.users.find(u => u.id === currentUserId);
  if (!targetUser || !currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isFollowing = targetUser.followers.includes(currentUserId);
  if (isFollowing) {
    targetUser.followers = targetUser.followers.filter(id => id !== currentUserId);
    currentUser.following = currentUser.following.filter(id => id !== targetUserId);
  } else {
    targetUser.followers.push(currentUserId);
    currentUser.following.push(targetUserId);
  }

  writeDB(db);
  res.json({ targetUser, currentUser });
});

// POST /api/posts - Create a new post
app.post('/api/posts', (req, res) => {
  const { userId, content, image } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ error: 'userId and content are required' });
  }

  const db = readDB();
  const newPost = {
    id: 'post' + Date.now(),
    userId,
    content,
    image: image || '',
    likes: [],
    createdAt: new Date().toISOString(),
    comments: []
  };

  db.posts.unshift(newPost);
  writeDB(db);
  res.status(201).json(newPost);
});

// POST /api/posts/:id/like - Toggle like on a post
app.post('/api/posts/:id/like', (req, res) => {
  const { userId } = req.body;
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const idx = post.likes.indexOf(userId);
  if (idx === -1) {
    post.likes.push(userId);
  } else {
    post.likes.splice(idx, 1);
  }

  writeDB(db);
  res.json(post);
});

// POST /api/posts/:id/comments - Add a comment to a post
app.post('/api/posts/:id/comments', (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text) {
    return res.status(400).json({ error: 'userId and text are required' });
  }

  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comment = {
    id: 'c' + Date.now(),
    userId,
    text,
    createdAt: new Date().toISOString()
  };

  post.comments.push(comment);
  writeDB(db);
  res.status(201).json(comment);
});

app.listen(PORT, () => {
  console.log(`CodeAlpha Social Media Server running on http://localhost:${PORT}`);
});
