# Builds API + web for a single Render web service (API serves static frontend).
FROM node:22-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web

# Vite embeds these at build time (not at runtime). On Render, declare matching
# env vars so they are passed as Docker build-args. Leave VITE_API_URL empty for
# same-origin /v1 calls.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL

# Fail the image build if frontend auth config is missing — otherwise the SPA
# boots to a blank white page (createClient(undefined, undefined)).
# $$ keeps values in the shell (not the Dockerfile layer / build log).
RUN if [ -z "$$VITE_SUPABASE_URL" ] || [ -z "$$VITE_SUPABASE_ANON_KEY" ]; then \
      echo "ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set as" \
           "build-time env vars / Docker build args (Render Environment)." >&2; \
      exit 1; \
    fi

RUN npm run build --workspace=packages/shared \
  && npm run build --workspace=apps/api \
  && npm run build --workspace=apps/web

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev

COPY --from=builder /repo/packages/shared/dist packages/shared/dist
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/web/dist apps/web/dist

# Render injects PORT; default 4000 for local docker runs.
ENV PORT=4000
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
