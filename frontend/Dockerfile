FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Use explicit host flag to ensure the server binds to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
