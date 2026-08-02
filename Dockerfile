FROM nginx:1.27-alpine
ARG WHATSAPP_NUMBER=50400000000
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets
RUN sed -i "s/50400000000/${WHATSAPP_NUMBER}/g" /usr/share/nginx/html/assets/app.js
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O - http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
