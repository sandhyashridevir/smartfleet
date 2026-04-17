FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 3001
RUN printf 'server { listen 3001; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
