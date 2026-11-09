FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends librsvg2-bin && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.js qr-service.js ./
COPY public ./public
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
EXPOSE 4173
USER node
CMD ["node","server.js"]
