FROM node:22-alpine
WORKDIR /app
COPY src ./src
COPY data ./data
COPY package.json LICENSE README.md ./
ENTRYPOINT ["node", "src/server.mjs"]
