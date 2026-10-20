import http.server
import json
import os
import re
import socketserver
import time
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
if not os.path.exists(PUBLIC_DIR):
    PUBLIC_DIR = BASE_DIR
DB_PATH = os.path.join(BASE_DIR, 'database.json')
PORT = int(os.environ.get('PORT', 4000))

def read_db():
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

class SocialMediaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def _read_body_json(self):
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len == 0:
            return {}
        raw = self.rfile.read(content_len).decode('utf-8')
        return json.loads(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split('?')[0]
        if clean_path == '/api/state':
            self._send_json(read_db())
            return
        super().do_GET()

    def do_PUT(self):
        clean_path = self.path.split('?')[0]
        user_match = re.match(r'^/api/users/([^/]+)$', clean_path)
        if user_match:
            user_id = user_match.group(1)
            body = self._read_body_json()
            db = read_db()
            user = next((u for u in db.get('users', []) if u.get('id') == user_id), None)
            if not user:
                self._send_json({'error': 'User not found'}, 404)
                return

            if 'name' in body and body['name']:
                user['name'] = body['name']
            if 'handle' in body and body['handle']:
                h = body['handle']
                user['handle'] = h if h.startswith('@') else f"@{h}"
            if 'bio' in body:
                user['bio'] = body['bio']
            if 'avatar' in body:
                user['avatar'] = body['avatar']

            write_db(db)
            self._send_json(user)
            return

        self._send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        clean_path = self.path.split('?')[0]

        # POST /api/users/:id/follow
        follow_match = re.match(r'^/api/users/([^/]+)/follow$', clean_path)
        if follow_match:
            target_user_id = follow_match.group(1)
            body = self._read_body_json()
            current_user_id = body.get('currentUserId')
            if not current_user_id or target_user_id == current_user_id:
                self._send_json({'error': 'Invalid follow action'}, 400)
                return

            db = read_db()
            target_user = next((u for u in db.get('users', []) if u.get('id') == target_user_id), None)
            current_user = next((u for u in db.get('users', []) if u.get('id') == current_user_id), None)

            if not target_user or not current_user:
                self._send_json({'error': 'User not found'}, 404)
                return

            if current_user_id in target_user.get('followers', []):
                target_user['followers'] = [uid for uid in target_user.get('followers', []) if uid != current_user_id]
                current_user['following'] = [uid for uid in current_user.get('following', []) if uid != target_user_id]
            else:
                target_user.setdefault('followers', []).append(current_user_id)
                current_user.setdefault('following', []).append(target_user_id)

            write_db(db)
            self._send_json({'targetUser': target_user, 'currentUser': current_user})
            return

        # POST /api/posts/:id/like
        like_match = re.match(r'^/api/posts/([^/]+)/like$', clean_path)
        if like_match:
            post_id = like_match.group(1)
            body = self._read_body_json()
            user_id = body.get('userId')
            db = read_db()
            post = next((p for p in db.get('posts', []) if p.get('id') == post_id), None)
            if not post:
                self._send_json({'error': 'Post not found'}, 404)
                return

            likes = post.setdefault('likes', [])
            if user_id in likes:
                likes.remove(user_id)
            else:
                likes.append(user_id)

            write_db(db)
            self._send_json(post)
            return

        # POST /api/posts/:id/comments
        comment_match = re.match(r'^/api/posts/([^/]+)/comments$', clean_path)
        if comment_match:
            post_id = comment_match.group(1)
            body = self._read_body_json()
            user_id = body.get('userId')
            text = body.get('text')
            if not user_id or not text:
                self._send_json({'error': 'userId and text are required'}, 400)
                return

            db = read_db()
            post = next((p for p in db.get('posts', []) if p.get('id') == post_id), None)
            if not post:
                self._send_json({'error': 'Post not found'}, 404)
                return

            comment = {
                'id': f"c{int(time.time() * 1000)}",
                'userId': user_id,
                'text': text,
                'createdAt': datetime.now(timezone.utc).isoformat()
            }
            post.setdefault('comments', []).append(comment)
            write_db(db)
            self._send_json(comment, 201)
            return

        # POST /api/posts
        if clean_path == '/api/posts':
            body = self._read_body_json()
            user_id = body.get('userId')
            content = body.get('content')
            if not user_id or not content:
                self._send_json({'error': 'userId and content are required'}, 400)
                return

            db = read_db()
            new_post = {
                'id': f"post{int(time.time() * 1000)}",
                'userId': user_id,
                'content': content,
                'image': body.get('image', ''),
                'likes': [],
                'createdAt': datetime.now(timezone.utc).isoformat(),
                'comments': []
            }
            db.setdefault('posts', []).insert(0, new_post)
            write_db(db)
            self._send_json(new_post, 201)
            return

        self._send_json({'error': 'Not found'}, 404)

if __name__ == '__main__':
    class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        allow_reuse_address = True

    with ThreadedTCPServer(('127.0.0.1', PORT), SocialMediaHandler) as httpd:
        print(f"CodeAlpha Social Media Server running at http://localhost:{PORT}")
        httpd.serve_forever()
