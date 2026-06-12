FROM node:24-alpine

# Build tools needed for n8n's native dependencies (sqlite3, etc.)
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm install -g n8n \
    && apk del .build-deps

RUN mkdir -p /home/node/.n8n /home/node/custom/n8n-nodes-bambuser \
    && chown -R node:node /home/node

# Compile custom nodes to CommonJS so n8n's require()-based loader can pick them up
WORKDIR /tmp/nodes-build
COPY package.json tsconfig.json ./
RUN npm install
COPY credentials ./credentials
COPY lib ./lib
COPY nodes ./nodes
RUN npx tsc --outDir /home/node/custom/n8n-nodes-bambuser && \
    cp credentials/bambuser.svg /home/node/custom/n8n-nodes-bambuser/credentials/ && \
    cp nodes/Bambuser/bambuser.svg /home/node/custom/n8n-nodes-bambuser/nodes/Bambuser/ && \
    cp nodes/BambuserWebhookTrigger/bambuser-webhook.svg /home/node/custom/n8n-nodes-bambuser/nodes/BambuserWebhookTrigger/

RUN chown -R node:node /home/node/custom

COPY scripts/n8n-start.sh /usr/local/bin/n8n-start.sh
RUN chmod +x /usr/local/bin/n8n-start.sh

USER node
WORKDIR /home/node

ENV N8N_CUSTOM_EXTENSIONS=/home/node/custom
ENV NODE_OPTIONS="--experimental-strip-types"

EXPOSE 5678
CMD ["/usr/local/bin/n8n-start.sh"]
