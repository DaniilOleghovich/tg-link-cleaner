# Telegram Link Bot

A Telegram moderation bot that automatically detects and removes messages containing links in group chats, mutes repeat offenders, verifies new members with a join-time captcha, and offers an interactive inline menu for admins. Built with [grammY](https://grammy.dev/) and PostgreSQL.

## Features

- 🔗 **Automatic link detection** — uses Telegram message entities (`url`, `text_link`, `mention`) for reliable detection, not fragile regex
- ✅ **Domain whitelist** — allow specific domains (e.g. your own channel or website) per chat
- 👮 **Admin & creator bypass** — chat administrators and the chat owner can post links freely; no separate user whitelist is needed
- ⏱️ **Auto-deleting warning** — after a link is removed, a warning is posted and automatically deleted a few seconds later
- 🚫 **Escalating mute** — a user who triggers the filter 3 times within a 10-minute window is automatically muted for 1 hour; the violation counter resets after a successful mute
- 🤖 **Join-time captcha** — new members are restricted on join and must press a verification button within 30 seconds or are removed (kicked, not permanently banned)
- 🖱️ **Interactive inline menu** (`/menu`) — toggle the link filter and manage the domain whitelist without typing full commands; protected so only admins/creator can use it, even after the menu message is visible to the whole chat
- ⚙️ **Per-chat settings** — enable/disable the filter independently for each group
- 🗄️ **PostgreSQL-backed** — persistent storage for chat settings, domain whitelist, and violation tracking
- 🚀 **Simple deployment** — long polling, no webhook, public domain, or SSL certificate required

## Tech Stack

- [Node.js](https://nodejs.org/) (18+)
- [grammY](https://grammy.dev/) — Telegram Bot API framework
- [@grammyjs/conversations](https://grammy.dev/plugins/conversations) — multi-step dialogs (used for adding a domain via the menu)
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
│   │   │   └── 003_drop_whitelist_users.sql
│   │   └── repositories/
│   │       ├── chats.js            # Per-chat settings (filter enabled/disabled)
│   │       ├── whitelist.js        # Domain whitelist only
│   │       └── violations.js       # Link-violation tracking for the mute logic
│   ├── handlers/
│   │   ├── message.js              # Core link-detection, deletion, warning & mute logic
│   │   ├── commands.js             # Text-based admin commands
│   │   ├── menu.js                 # /menu command + main keyboard builder
│   │   ├── menuCallbacks.js        # Inline button handlers (filter, domains)
│   │   └── newMember.js            # Join-time captcha logic
│   ├── conversations/
│   │   └── addDomain.js            # Dialog for adding a domain via the menu
│   ├── middlewares/
│   │   ├── admin-only.js           # Restricts commands to admins/creator
│   │   └── admin-only-callback.js  # Restricts inline button presses to admins/creator
│   └── utils/
│       ├── link-detector.js        # Link/domain extraction helpers
│       └── permissions.js          # Shared admin/creator status check
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

### Bot Permissions & Settings

In the group, the bot must be an **administrator** with:
- **Delete messages** — required to remove messages containing links
- **Restrict members** — required for muting repeat offenders and for the join-time captcha

In [@BotFather](https://t.me/BotFather), **Group Privacy must be turned off** (`/mybots` → your bot → Bot Settings → Group Privacy → Turn off), otherwise the bot only sees commands and cannot inspect regular messages for links.

## Commands

| Command | Description | Access |
|---|---|---|
| `/menu` | Open the interactive inline menu (filter toggle, domain whitelist) | Admins & creator only |
| `/settings` | Show current filter status and whitelisted domains | Admins & creator only |
| `/toggle_filter` | Enable or disable link filtering for the chat | Admins & creator only |
| `/whitelist_add <domain>` | Add a domain to the whitelist | Admins & creator only |
| `/whitelist_remove <domain>` | Remove a domain from the whitelist | Admins & creator only |

Commands only work in groups, not in a private chat with the bot.

## How It Works

### Link filtering & muting

1. A non-admin sends a message containing a link that isn't on the chat's domain whitelist.
2. The message is deleted, and a violation is recorded for that user (chat-scoped, timestamped).
3. A warning is posted ("links aren't allowed here") and auto-deleted after ~12 seconds.
4. If the user has accumulated **3 violations within the last 10 minutes**, they are muted for **1 hour** instead of just warned, and their violation counter is cleared.

Admins and the chat creator bypass the filter entirely — their links are never touched.

### Join-time captcha

1. When a new member joins, the bot immediately restricts them (mute) and posts a message with an "✅ I'm not a bot" button.
2. Only the joining user can press their own button — presses from anyone else are rejected.
3. If they press it within 30 seconds, restrictions are lifted and the verification message is deleted.
4. If they don't, they are kicked (banned then immediately unbanned, so they can rejoin via a fresh invite) and the message is cleaned up.

> **Note:** the 30-second timer is held in memory. If the bot restarts during that window, the timeout won't fire and the user will stay muted until an admin intervenes manually. For higher reliability, pending verifications could be persisted to the database and re-checked on startup — not currently implemented.

### Inline menu

`/menu` opens a keyboard for toggling the filter and managing the domain whitelist (add via a guided conversation, remove via per-domain buttons). Since the menu message is visible to the entire chat, every button press is separately checked against the presser's admin/creator status — opening the menu doesn't grant access to whoever clicks it afterward.

## Deployment

The bot uses long polling, so no public domain, webhook, or SSL certificate is required. A minimal VPS (1-2 vCPU, 1-2GB RAM) running Node.js, PostgreSQL, and PM2 is sufficient for production use.

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

## License

MIT
