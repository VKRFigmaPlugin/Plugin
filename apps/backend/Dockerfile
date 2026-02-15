FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=1
ENV CHOKIDAR_INTERVAL=250

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev:backend"]