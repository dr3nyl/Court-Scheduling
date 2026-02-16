# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Build-time API URL (set when building for production, e.g. http://your-ec2-ip:8000 or https://api.example.com)
ARG REACT_APP_API_URL=http://localhost:8000/api
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Production stage: serve with nginx
FROM nginx:alpine

# SPA config so React Router routes work on refresh
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
