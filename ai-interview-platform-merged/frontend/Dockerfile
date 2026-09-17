FROM nginx:alpine

# Root-relative asset paths (see /css, /js, /images references in every
# page) mean this works correctly served from any path depth.
COPY . /usr/share/nginx/html

# Plain nginx has no "clean URL" support out of the box (unlike `npx serve`,
# which this project was originally developed against) — without this,
# /login 404s even though /login.html exists. This config adds that
# fallback so extensionless/bookmarked URLs keep working.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
