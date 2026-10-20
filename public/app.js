const INITIAL_STATE = {
  users: [
    {
      id: 'u1',
      name: 'Kishore Prabhu',
      handle: '@kishore_dev',
      bio: 'Full-Stack Developer | Passionate about building modern web apps & scalable backend systems 🚀',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
      followers: ['u2', 'u3'],
      following: ['u2']
    },
    {
      id: 'u2',
      name: 'Sophia Chen',
      handle: '@sophia_codes',
      bio: 'UI/UX Engineer & Open Source Contributor ✨ | Coffee + CSS Grid enthusiast.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      followers: ['u1'],
      following: ['u1', 'u3']
    },
    {
      id: 'u3',
      name: 'Liam Patel',
      handle: '@liam_cloud',
      bio: 'Backend Architect | APIs, Distributed Systems & Express.js.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      followers: ['u2'],
      following: ['u1']
    }
  ],
  posts: [
    {
      id: 'post1',
      userId: 'u2',
      content: 'Just shipped a fresh dark-mode dashboard design! Clean typography and subtle glassmorphism always make interfaces pop. What do you think? 🎨✨',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
      likes: ['u1', 'u3'],
      createdAt: '2026-10-01T10:30:00.000Z',
      comments: [
        {
          id: 'c1',
          userId: 'u1',
          text: 'Looks super crisp Sophia! Love the contrast ratios.',
          createdAt: '2026-10-01T11:00:00.000Z'
        }
      ]
    },
    {
      id: 'post2',
      userId: 'u1',
      content: 'Excited to complete my Full Stack Development Internship tasks with @CodeAlpha! Built this Social Media Platform from scratch using HTML, CSS, JavaScript, and Node.js/Express 💻🔥',
      image: '',
      likes: ['u2'],
      createdAt: '2026-10-01T12:15:00.000Z',
      comments: [
        {
          id: 'c2',
          userId: 'u3',
          text: 'Congrats Kishore! The REST API structure and clean UI are rock solid.',
          createdAt: '2026-10-01T12:40:00.000Z'
        }
      ]
    }
  ]
};

let state = { users: [], posts: [] };
let currentUserId = 'u1';
let feedMode = 'all';

const toastEl = document.getElementById('toast');
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 2400);
}

function saveLocalState() {
  localStorage.setItem('ca_social_state', JSON.stringify(state));
}

async function loadState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('Offline mode');
    state = await res.json();
  } catch {
    const cached = localStorage.getItem('ca_social_state');
    state = cached ? JSON.parse(cached) : INITIAL_STATE;
    saveLocalState();
  }
  renderAll();
}

function getUser(id) {
  return state.users.find(u => u.id === id) || state.users[0];
}

function renderAll() {
  renderUserSelect();
  renderCurrentUserCard();
  renderSuggestedUsers();
  renderFeed();
}

function renderUserSelect() {
  const select = document.getElementById('activeUserSelect');
  select.innerHTML = state.users
    .map(
      u => `<option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>${u.name} (${u.handle})</option>`
    )
    .join('');
}

document.getElementById('activeUserSelect').addEventListener('change', e => {
  currentUserId = e.target.value;
  renderAll();
  showToast(`Switched active profile to ${getUser(currentUserId).name}`);
});

function renderCurrentUserCard() {
  const user = getUser(currentUserId);
  const userPostsCount = state.posts.filter(p => p.userId === user.id).length;
  document.getElementById('currentUserCard').innerHTML = `
    <div class="profile-header">
      <img src="${user.avatar}" alt="${user.name}" class="avatar-lg" />
      <div>
        <h3>${user.name}</h3>
        <span class="muted">${user.handle}</span>
      </div>
    </div>
    <p style="font-size:0.9rem;">${user.bio}</p>
    <div class="profile-stats">
      <div><strong>${userPostsCount}</strong><span class="muted">Posts</span></div>
      <div><strong>${user.followers.length}</strong><span class="muted">Followers</span></div>
      <div><strong>${user.following.length}</strong><span class="muted">Following</span></div>
    </div>
    <button class="btn btn-outline" style="width:100%;" onclick="openEditProfileModal()">✏️ Edit Profile</button>
  `;
}

function renderSuggestedUsers() {
  const me = getUser(currentUserId);
  const others = state.users.filter(u => u.id !== currentUserId);
  document.getElementById('suggestedUsersList').innerHTML = others
    .map(u => {
      const isFollowing = me.following.includes(u.id);
      return `
      <div class="user-row">
        <div class="user-row-info">
          <img src="${u.avatar}" alt="${u.name}" class="avatar-sm" />
          <div>
            <div style="font-weight:600; font-size:0.92rem;">${u.name}</div>
            <div class="muted">${u.handle} · ${u.followers.length} followers</div>
          </div>
        </div>
        <button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'}" onclick="toggleFollow('${u.id}')">
          ${isFollowing ? 'Following' : '+ Follow'}
        </button>
      </div>
    `;
    })
    .join('');
}

function renderFeed() {
  const me = getUser(currentUserId);
  const feedEl = document.getElementById('postsFeed');

  const visiblePosts = state.posts.filter(post => {
    if (feedMode === 'all') return true;
    return me.following.includes(post.userId) || post.userId === currentUserId;
  });

  if (visiblePosts.length === 0) {
    feedEl.innerHTML = `<div class="card"><p class="muted">No posts in this feed yet. Follow more creators or publish a new post!</p></div>`;
    return;
  }

  feedEl.innerHTML = visiblePosts
    .map(post => {
      const author = getUser(post.userId);
      const isLiked = post.likes.includes(currentUserId);
      return `
      <article class="post-card">
        <div class="post-author">
          <div class="post-author-left">
            <img src="${author.avatar}" alt="${author.name}" class="avatar-sm" />
            <div>
              <strong>${author.name}</strong> <span class="muted">${author.handle}</span>
              <div class="muted">${new Date(post.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <p class="post-content">${post.content}</p>
        ${post.image ? `<img src="${post.image}" alt="Post attachment" class="post-media" />` : ''}
        <div class="post-actions">
          <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
            ${isLiked ? '❤️' : '🤍'} ${post.likes.length} Like${post.likes.length === 1 ? '' : 's'}
          </button>
          <span class="action-btn">💬 ${post.comments.length} Comment${post.comments.length === 1 ? '' : 's'}</span>
        </div>

        <div class="comments-box">
          ${post.comments
            .map(c => {
              const commenter = getUser(c.userId);
              return `
              <div class="comment-item">
                <strong>${commenter.name}</strong> <span class="muted">${commenter.handle}</span>: ${c.text}
              </div>
            `;
            })
            .join('')}
          <form class="comment-form" onsubmit="submitComment(event, '${post.id}')">
            <input type="text" placeholder="Write a comment..." required />
            <button type="submit" class="btn btn-outline">Reply</button>
          </form>
        </div>
      </article>
    `;
    })
    .join('');
}

// Follow / Unfollow Handler
window.toggleFollow = async function (targetId) {
  try {
    const res = await fetch(`/api/users/${targetId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUserId })
    });
    if (!res.ok) throw new Error('Offline follow');
    await loadState();
  } catch {
    const me = getUser(currentUserId);
    const target = getUser(targetId);
    const following = me.following.includes(targetId);
    if (following) {
      me.following = me.following.filter(id => id !== targetId);
      target.followers = target.followers.filter(id => id !== currentUserId);
    } else {
      me.following.push(targetId);
      target.followers.push(currentUserId);
    }
    saveLocalState();
    renderAll();
  }
};

// Create New Post
document.getElementById('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  const content = document.getElementById('postContent').value.trim();
  const image = document.getElementById('postImage').value.trim();
  if (!content) return;

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, content, image })
    });
    if (!res.ok) throw new Error('Offline post');
    await loadState();
  } catch {
    state.posts.unshift({
      id: 'post' + Date.now(),
      userId: currentUserId,
      content,
      image,
      likes: [],
      createdAt: new Date().toISOString(),
      comments: []
    });
    saveLocalState();
    renderAll();
  }

  document.getElementById('postForm').reset();
  showToast('Post published!');
});

// Like / Unlike Post
window.toggleLike = async function (postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId })
    });
    if (!res.ok) throw new Error('Offline like');
    await loadState();
  } catch {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    const idx = post.likes.indexOf(currentUserId);
    if (idx === -1) post.likes.push(currentUserId);
    else post.likes.splice(idx, 1);
    saveLocalState();
    renderAll();
  }
};

// Add Comment
window.submitComment = async function (e, postId) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, text })
    });
    if (!res.ok) throw new Error('Offline comment');
    await loadState();
  } catch {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push({
      id: 'c' + Date.now(),
      userId: currentUserId,
      text,
      createdAt: new Date().toISOString()
    });
    saveLocalState();
    renderAll();
  }
};

// Edit Profile Modal
window.openEditProfileModal = function () {
  const me = getUser(currentUserId);
  document.getElementById('editName').value = me.name;
  document.getElementById('editHandle').value = me.handle;
  document.getElementById('editBio').value = me.bio;
  document.getElementById('editAvatar').value = me.avatar;
  document.getElementById('editProfileModal').classList.remove('hidden');
};

document.getElementById('closeProfileModal').addEventListener('click', () => {
  document.getElementById('editProfileModal').classList.add('hidden');
});

document.getElementById('editProfileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('editName').value.trim(),
    handle: document.getElementById('editHandle').value.trim(),
    bio: document.getElementById('editBio').value.trim(),
    avatar: document.getElementById('editAvatar').value.trim()
  };

  try {
    const res = await fetch(`/api/users/${currentUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Offline profile update');
    await loadState();
  } catch {
    const me = getUser(currentUserId);
    me.name = payload.name;
    me.handle = payload.handle.startsWith('@') ? payload.handle : `@${payload.handle}`;
    me.bio = payload.bio;
    if (payload.avatar) me.avatar = payload.avatar;
    saveLocalState();
    renderAll();
  }

  document.getElementById('editProfileModal').classList.add('hidden');
  showToast('Profile updated!');
});

// Feed filter tabs
document.querySelectorAll('.feed-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.feed-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    feedMode = btn.dataset.feed;
    renderFeed();
  });
});

loadState();
