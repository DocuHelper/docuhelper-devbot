#!/bin/bash
set -e

# ── 인증: credentials 파일 우선, 환경변수 폴백 ──
if [ -f "$HOME/.credentials.json" ]; then
  TOKEN=$(node -e "const d=require('$HOME/.credentials.json'); console.log(d.claudeAiOauth?.accessToken || '')" 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    export ANTHROPIC_API_KEY="$TOKEN"
    echo '{"event":"auth","method":"credentials_file"}'
  fi
fi

if [ -z "$ANTHROPIC_API_KEY" ] && [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  export ANTHROPIC_API_KEY="$CLAUDE_CODE_OAUTH_TOKEN"
  echo '{"event":"auth","method":"oauth_token"}'
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo '{"event":"error","message":"ANTHROPIC_API_KEY, CLAUDE_CODE_OAUTH_TOKEN, 또는 .credentials.json이 필요합니다"}'
  exit 1
fi

# ── Git credential helper ──
if [ -n "$GH_TOKEN" ]; then
  git config --global credential.https://github.com.helper '!f() { echo "username=x-access-token"; echo "password=$GH_TOKEN"; }; f'
fi

# ── Agent 실행 ──
echo '{"event":"starting_agent"}'
exec node /app/dist/index.js "$@"
