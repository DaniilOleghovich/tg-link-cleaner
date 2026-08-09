# Telegram Link Bot

A Telegram moderation bot that detects and removes links, unauthorized channel/user mentions, forwarded posts from outside channels, and forwarded stories in group chats — with a permanent mute for repeat offenders, a join-time captcha for new members, and an interactive admin-only inline menu. Built with [grammY](https://grammy.dev/) and PostgreSQL.

## Features

- 🔗 **Link & mention detection** — checks message text, media captions, and link previews (including previews left behind after the link text itself was deleted), using Telegram message entities rather than fragile regex
- ✅ **Domain whitelist** — allow specific external domains (e.g. your own website) per chat
- 📢 **Owner channels whitelist** — allow specific Telegram channels (by `@username` or `t.me/username` link) to be mentioned or linked; supports adding multiple channels one at a time, with format validation against Telegram's username rules
- 👮 **Admin & creator bypass** — chat administrators and the chat owner can post links and mention anyone freely; their admin status (including usernames) is cached briefly to avoid hitting the Telegram API on every message
- 🔁 **Forwarded content control** — blocks forwarded Stories outright, and blocks forwarded posts from any channel not on the owner-channels whitelist, regardless of whether the message contains a link
- ✏️ **Edited-message coverage** — the same checks run on message edits, catching cases where a link preview is added or left behind after editing
- ⏱️ **Auto-deleting warning** — after a violation, a warning is posted and automatically removed a few seconds later; the wording adapts to the reason (link, forwarded story, forwarded channel)
- 🚫 **Permanent mute after 3 strikes** — a user who triggers the filter 3 times within a 10-minute window is muted indefinitely; only an admin can lift it manually. The violation counter is cleared right after a successful mute.
- 🤖 **Join-time captcha** — new members are restricted on join and must press a verification button (only they can press their own button) to start writing; can be toggled on/off per chat
- 🖱️ **Interactive inline menu** (`/menu`) — toggle the link filter, manage the domain whitelist, manage owner channels, and toggle new-member verification, all through buttons. Protected so only admins/creator can act on it, even after the menu message is visible to the whole chat. The menu keyboard auto-expires after 5 minutes of inactivity, and opening `/menu` again replaces any previously open menu instead of leaving duplicates in the chat.
- ⚙️ **Per-chat settings** — every toggle above is independent per group
- 🗄️ **PostgreSQL-backed** — persistent storage for chat settings, domain whitelist, owner channels, and violation tracking
- 🚀 **Simple deployment** — long polling, no webhook, public domain, or SSL certificate required

## Tech Stack

- [Node.js](https://nodejs.org/) (18+)
- [grammY](https://grammy.dev/) — Telegram Bot API framework
- [@grammyjs/conversations](https://grammy.dev/plugins/conversations) — multi-step dialogs (used for adding a domain or an owner channel via the menu)
- [PostgreSQL](https://www.postgresql.org/) — data persistence
- [pg](https://node-postgres.com/) — Postgres client
- [PM2](https://pm2.keymetrics.io/) — process management (production)

## Project Structure

```
telegram-link-bot/
├── src/
│   ├── bot.js                      # Bot entry point, middleware, startup
│   ├── config.js                   # Environment configuration
│   ├── db/
│   │   ├── pool.js                 # Postgres connection pool
│   │   ├── migrate.js              # Migration runner (applies all .sql files in order)
│   │   ├── migrations/
│   │   │   ├── 001_init.sql
│   │   │   ├── 002_violations.sql
│   │   │   ├── 003_drop_whitelist_users.sql
│   │   │   ├── 004_verification_toggle.sql
│   │   │   └── 006_owner_channels_table.sql
│   │   └── repositories/
│   │       ├── chats.js            # Per-chat settings (filter/verification toggles)
│   │       ├── whitelist.js        # Domain whitelist
│   │       ├── ownerChannels.js     # Whitelisted Telegram channels
│   │       └── violations.js       # Violation tracking for the mute logic
│   ├── handlers/
│   │   ├── message.js              # Core detection, deletion, warning & mute logic
│   │   ├── commands.js             # Text-based admin commands
│   │   ├── menu.js                 # /menu command + main keyboard builder
│   │   ├── menuCallbacks.js        # Inline button handlers
│   │   └── newMember.js            # Join-time captcha logic
│   ├── conversations/
│   │   ├── addDomain.js            # Dialog for adding a domain via the menu
│   │   └── addOwnerChannel.js      # Dialog for adding an owner channel via the menu
│   ├── middlewares/
│   │   ├── admin-only.js           # Restricts commands to admins/creator
│   │   └── admin-only-callback.js  # Restricts inline button presses to admins/creator
│   └── utils/
│       ├── link-detector.js        # Link/mention extraction & channel-username validation
│       ├── permissions.js          # Shared admin/creator status check
│       ├── adminCache.js           # Short-lived cache of a chat's admin user IDs/usernames
│       └── menuTracker.js          # Tracks the currently open menu message + its expiry timer
├── docker-compose.yml               # Local Postgres for development
├── .env.example
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Docker, for local development)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <your-repo-url>
   cd telegram-link-bot
   npm install
   ```

2. Copy the environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   `docker-compose.yml` reads `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` from `.env` — no credentials are hardcoded in the compose file.

3. Start a local Postgres instance (optional, for development):
   ```bash
   docker compose up -d
   ```

4. Run the database migrations (applies every `.sql` file in `src/db/migrations/`, in order):
   ```bash
   npm run migrate
   ```

5. Start the bot:
   ```bash
   npm start
   ```

### Testing changes without touching production

Telegram doesn't allow two simultaneous long-polling connections on the same bot token. To test locally while the bot is running on your VPS, create a **separate test bot** via [@BotFather](https://t.me/BotFather), use its token in a local `.env` pointing at a local Postgres instance, and test in a separate Telegram group. Never run the production token locally while it's also running on the server.

### Bot Permissions & Settings

In the group, the bot must be an **administrator** with:
- **Delete messages** — required to remove violating messages
- **Restrict members** — required for muting repeat offenders and for the join-time captcha

In [@BotFather](https://t.me/BotFather), **Group Privacy must be turned off** (`/mybots` → your bot → Bot Settings → Group Privacy → Turn off), otherwise the bot only sees commands and cannot inspect regular messages.

## Commands

| Command | Description | Access |
|---|---|---|
| `/menu` | Open the interactive inline menu | Admins & creator only |
| `/settings` | Show current filter, verification, domain, and owner-channel status | Admins & creator only |
| `/toggle_filter` | Enable or disable link/mention filtering for the chat | Admins & creator only |
| `/toggle_verification` | Enable or disable the join-time captcha | Admins & creator only |
| `/whitelist_add <domain>` | Add an external domain to the whitelist | Admins & creator only |
| `/whitelist_remove <domain>` | Remove a domain from the whitelist | Admins & creator only |
| `/owner_channel_add <username or link>` | Add a Telegram channel to the allowed list | Admins & creator only |
| `/owner_channel_remove <username>` | Remove a channel from the allowed list | Admins & creator only |

Commands only work in groups, not in a private chat with the bot.

## How It Works

### What gets checked, and where

Every incoming message (and every edit to it) is scanned for:

1. **Forwarded Stories** — blocked outright, no exceptions besides admins/creator.
2. **Forwards from channels** — if the forward's origin is a channel not on the owner-channels whitelist, the message is blocked regardless of its text content.
3. **Links and mentions**, pulled from three places:
   - the message text (`entities`)
   - a media caption (`caption_entities`) — covers photos, videos, and forwarded Stories with a comment
   - the link preview (`link_preview_options.url`) — covers the case where a link's text is deleted but its preview is left attached to the message

Each link/mention found is checked in this order:
- Is it `@username` or `t.me/username` for an admin, the creator, or a whitelisted owner channel? → allowed
- Is it a regular external domain on the domain whitelist? → allowed
- Otherwise → violation

Admins and the chat creator bypass all of the above entirely.

### Violations & muting

1. On a violation, the message is deleted (with a short retry if Telegram briefly reports it "can't be deleted" — this can happen while Telegram is still generating the link preview).
2. A violation is recorded for that user, chat-scoped and timestamped.
3. A warning is posted and auto-deleted after ~12 seconds, with wording that matches the reason (link, forwarded story, forwarded channel).
4. If the user has 3 violations within the last 10 minutes, they are **muted indefinitely** instead of just warned, and their violation counter is cleared. Only an admin can lift the mute manually — there is no automatic un-mute.

### Owner channels

Chats can whitelist one or more Telegram channels — typically the owner's own channel(s) — so they can be freely linked or mentioned. Channels are added one at a time via `/owner_channel_add` or the menu, accepting either a bare `@username`, a `t.me/username` link, or a plain username; input is validated against Telegram's username rules (5–32 characters, starts with a letter, no trailing or double underscores) before being stored. Private invite links (`t.me/+...`) are never accepted, since they carry a random code rather than a stable username and can't be meaningfully whitelisted.

### Join-time captcha

1. When a new member joins, the bot restricts them and posts a message with an "✅ I'm not a bot" button (only shown if verification is enabled for the chat).
2. Only the joining user can press their own button — presses from anyone else are rejected.
3. Pressing it lifts the restriction; the bot does not currently auto-kick users who never press it (the restriction simply stays in place until they do, or until an admin intervenes).

### Inline menu

`/menu` opens a keyboard for toggling the link filter and new-member verification, and for managing the domain whitelist and owner channels. Since the menu message is visible to the whole chat, every button press is checked against the presser's admin/creator status — opening the menu doesn't grant access to whoever clicks it afterward. The keyboard is removed automatically after 5 minutes of inactivity, and re-running `/menu` deletes any previously open menu for that chat before posting a new one.

## Deployment

The bot uses long polling, so no public domain, webhook, or SSL certificate is required. A minimal VPS (1-2 vCPU, 1-2GB RAM) running Node.js, PostgreSQL, and PM2 is sufficient for production use. See `DEPLOYMENT.md` for a full step-by-step guide (both for a fresh server and for a server where access is provided by someone else), and `SERVER_CHEATSHEET.md` for a quick day-to-day command reference.

```bash
npm install -g pm2
pm2 start src/bot.js --name link-bot
pm2 save
pm2 startup
```

## Security Notes

- Never commit `.env` — it holds the bot token and database credentials (already covered by `.gitignore`).
- Postgres should only listen on `localhost`; don't expose port 5432 publicly.
- The violation-tracking table (`link_violations`) intentionally stores no message content or usernames — only chat ID, user ID, and timestamps, to minimize retained personal data.
- If deploying on a server owned by someone else, avoid disabling SSH password authentication globally (`PasswordAuthentication no`) unless coordinated with the server owner, since it affects every user on the box, not just your own account.

## Known Limitations

- The join-time captcha does not currently auto-remove users who never verify — they simply remain restricted indefinitely.
- The admin cache (used to allow mentioning admins/creator) has a short TTL, so a very recently promoted/demoted admin's mention status may lag by a few minutes.
- Pending open-menu timers and per-message dedup state are held in memory, not the database — a bot restart mid-window will lose that state (e.g. a stale menu keyboard may not auto-expire until manually reopened).

## License

MIT
