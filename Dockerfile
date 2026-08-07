FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY . .
RUN rm -f ./Dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
