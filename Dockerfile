FROM node:22-slim

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

RUN chmod +x entrypoint.sh

# Claude Code CLI (Agent SDK 런타임)
RUN curl -fsSL claude.ai/install.sh | bash || true

ENTRYPOINT ["/app/entrypoint.sh"]
