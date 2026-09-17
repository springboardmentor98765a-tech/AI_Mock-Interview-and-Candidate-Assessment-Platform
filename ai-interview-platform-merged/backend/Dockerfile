FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000
# Seed the default admin account on every boot — seed.js checks first and
# no-ops if it already exists, so this is safe to run every time and
# means you don't need a separate manual `npm run seed` step under Docker.
CMD ["sh", "-c", "node db/seed.js && node server.js"]
