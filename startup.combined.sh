#!/bin/sh
set -eu
API_PID=""
NGINX_PID=""
shutdown(){ trap - TERM INT EXIT; [ -n "$NGINX_PID" ] && kill "$NGINX_PID" 2>/dev/null || true; [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true; }
trap shutdown TERM INT EXIT
cd /app/api
node server.js >>/var/log/api.log 2>&1 &
API_PID=$!
ready=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  kill -0 "$API_PID" 2>/dev/null || { cat /var/log/api.log 2>/dev/null || true; exit 1; }
  if wget -q -O- http://127.0.0.1:3001/api/health >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" -eq 1 ] || { cat /var/log/api.log 2>/dev/null || true; exit 1; }
nginx -g "daemon off;" &
NGINX_PID=$!
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do sleep 2; done
exit 1
