# -*- coding: utf-8 -*-
"""스프라이트 베이커용 로컬 서버.

실행:  python tools/bake_server.py
열기:  http://127.0.0.1:8777/tools/spritebaker.html

- 게임 폴더를 정적 파일로 보여 주고,
- 베이커 페이지가 보낸 스프라이트 시트(PNG)와 anim.js 를 sprites/ 폴더 안에만 저장한다.
- 이 PC 안(127.0.0.1)에서만 접속된다.
"""
import base64
import http.server
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, 'sprites')
PORT = 8777


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # 시트 · 스크립트를 고친 뒤 새로고침하면 바로 반영되도록 캐시하지 않는다
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/save':
            self.send_error(404)
            return
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
        path = os.path.normpath(os.path.join(ROOT, body['path']))
        if not path.startswith(SPRITES + os.sep):
            self.send_error(403, 'sprites 폴더 밖에는 저장할 수 없습니다')
            return
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = body['data']
        if data.startswith('data:'):
            with open(path, 'wb') as f:
                f.write(base64.b64decode(data.split(',', 1)[1]))
        else:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')


if __name__ == '__main__':
    print(f'스프라이트 베이커: http://127.0.0.1:{PORT}/tools/spritebaker.html  (종료: Ctrl+C)')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
