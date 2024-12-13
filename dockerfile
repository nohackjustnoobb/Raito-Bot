FROM denoland/deno:alpine

WORKDIR /app

COPY . .

RUN deno cache src/main.ts

EXPOSE 8080

CMD ["run", "--allow-net", "--allow-env", "src/main.ts"]
