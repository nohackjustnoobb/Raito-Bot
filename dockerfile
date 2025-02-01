FROM denoland/deno:alpine

WORKDIR /app

COPY . .

RUN deno install --allow-scripts=npm:webtorrent,npm:node-datachannel
RUN deno cache src/index.ts

CMD ["run", \
    "--allow-net", \
    "--allow-env", \
    "--allow-read", \
    "--allow-write", \
    "--allow-ffi", \
    "--allow-sys", \
    "--allow-run", \
    "src/index.ts"]
