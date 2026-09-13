FROM nginx:alpine

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=3s --start-period=8s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
