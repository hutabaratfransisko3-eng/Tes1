# YouTube/Spotify to Top4Top Discord Bot

Slash command `/link2top4top` plus automatic in-chat detection: paste a YouTube
or Spotify track link in a channel the bot can read, and it replies with a
permanent Top4Top download link for the audio.

## Deploying on Railway

1. Push this folder to a GitHub repo (or use Railway's "Deploy from local
   directory" / drag-and-drop if offered), then create a new Railway project
   from it.
2. There is intentionally no `package-lock.json` here — Railway/Nixpacks
   will run a plain `npm install` against the public npm registry and
   generate its own lockfile. (The original lockfile was generated inside
   Replit's environment and pointed at an internal package proxy that
   Railway can't reach, which is what caused the `ERR_MODULE_NOT_FOUND`
   error on your last deploy attempt.)
3. In the Railway project's **Variables** tab, add:
   - `DISCORD_BOT_TOKEN` — from the Discord Developer Portal (Bot -> Token).
   - `YT_TARGET_CHANNEL_ID` — optional, only if you want to limit
     auto-detection to one channel.
4. In the Discord Developer Portal, under your application's **Bot** page,
   enable **Message Content Intent** under "Privileged Gateway Intents" —
   the bot cannot read chat messages to auto-detect links without it.
5. Deploy. Check the Railway service logs for `Logged in as <bot tag>` to
   confirm it connected.

This is a worker/background service, not a web server — it does not listen
on a port, so no domain or port configuration is needed on Railway.

## Local development

```bash
npm install
cp .env.example .env   # then fill in DISCORD_BOT_TOKEN
npm start
```
