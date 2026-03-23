FROM nginx:alpine
# Copy static files (metadata will be mounted via volume for speed)
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
