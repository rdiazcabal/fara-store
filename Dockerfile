FROM node:22-alpine AS inventory-builder
WORKDIR /src
COPY assets/inventory-core.js assets/inventory-catalog.json assets/inventory-additions-20260909.json ./assets/
COPY data/inventory-snapshot-20260909.json ./data/
COPY scripts/build-inventory.js scripts/reconcile-inventory.js ./scripts/
RUN node scripts/reconcile-inventory.js /tmp/inventory-catalog.json

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY *.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY --from=inventory-builder /tmp/inventory-catalog.json /usr/share/nginx/html/assets/inventory-catalog.json
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O - http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
