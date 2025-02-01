# Raito Bot

A telegram bot.

## Quick Start

1. Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/nohackjustnoobb/Raito-Bot.git
cd Raito-Bot
```

2. Create a .env File

Inside the project directory, create a .env file with the following content:

```bash
BOT_TOKEN=<your-bot-token>
SOURCE=<your-repo-url> # Optional
```

3. Run the Bot with Docker Compose

Start the bot using Docker Compose:

```bash
docker-compose up -d
```

This will build and start the bot container in detached mode.

## Enable Torrent Support

Depending on whether you have a local Telegram API server, follow the appropriate steps:

### If You Have a Local Telegram API Server

1. Update the .env File

Add the following environment variable to your .env file:

```bash
API_ROOT=<url-to-your-telegram-api-server>
```

2. Start the Bot Normally

Run the bot using the standard Docker Compose command:

```bash
docker-compose up -d
```

### If You Do Not Have a Local Telegram API Server

1. Update the .env File

Add the following environment variables to your .env file:

```bash
TELEGRAM_API_ID=<your-telegram-api-id>
TELEGRAM_API_HASH=<your-telegram-api-hash>
```

2. Use the Torrent-Specific Docker Compose File

Start the bot using the alternative Docker Compose file:

```bash
docker-compose -f docker-compose/docker-compose-torrent.yml up -d
```

## Bypass Cloudflare Protection

Depending on whether you have a [cf-clearance-scraper](https://github.com/ZFC-Digital/cf-clearance-scraper) server, follow the appropriate steps:

### If You Have a cf-clearance-scraper Server

1. Update the .env File

Add the following environment variable to your .env file:

```bash
CF_CLEARANCE_URL=<full-url-to-your-cf-clearance-scraper-server>
```

2. Start the Bot Normally

Run the bot using the standard Docker Compose command:

```bash
docker-compose up -d
```

### If You Do Not Have a cf-clearance-scraper Server

1. Use the Cloudflare-Specific Docker Compose File

Start the bot using the alternative Docker Compose file:

```bash
docker-compose -f docker-compose/docker-compose-cf.yml up -d
```

## Enable All Features

To enable all features of the bot, follow these steps:

1. Update the .env File

Add the following environment variables to your .env file:

```bash
TELEGRAM_API_ID=<your-telegram-api-id>
TELEGRAM_API_HASH=<your-telegram-api-hash>
```

2. Start the Bot with the All-in-One Docker Compose File

Run the bot using the comprehensive Docker Compose configuration:

```bash
docker-compose -f docker-compose/docker-compose-aio.yml up -d
```
