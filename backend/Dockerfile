FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copy all source files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "run", "start"]
