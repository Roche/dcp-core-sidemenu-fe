ARG BASE_IMAGE_VERSION
ARG BASE_IMAGE_NAME

FROM node:20.19.6-alpine AS build-stage
WORKDIR /app

COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM ${BASE_IMAGE_NAME}:${BASE_IMAGE_VERSION} AS production-stage
COPY --from=build-stage --chown=appuser:appuser --chmod=555 /app/dist /usr/share/nginx/html
COPY --chown=appuser:appuser --chmod=444 config.json.template /etc/nginx/config.json.template

RUN find /usr/share/nginx/html -type f -exec chmod 444 {} + \
    && chmod u+w /usr/share/nginx/html

USER appuser
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
