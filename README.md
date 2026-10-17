Archival style webapp organising and presenting historical information about Jesus. 

www.thejesuswebsite.org

---

## Built with

Plain HTML, CSS and JavaScript, with no framework and no build step. A Node.js
and Express API reads and writes one SQLite database. The admin pages use
passkey (WebAuthn) login only.

## Run it locally

You need Node.js 18 or later and the `sqlite3` command.

1. Install the API packages: `cd api && npm install`
2. Create an empty database from the schema:
   `sqlite3 database/thejesuswebsite.db < database/schema.sql`
3. Start the API on port 3000: `npm run dev` (inside `api/`)
4. In a second terminal, from the repo root, serve the public site:
   `node dev-proxy.js frontend 4174`. Then open http://localhost:4174.
   The proxy sends `/api/` requests to the API, the same as nginx in production.

To use the admin pages, serve `admin` instead of `frontend`. To create the first
passkey, set `SETUP_TOKEN` in `.env`. Then open
`/auth/register.html?setupToken=<your token>`. Registration works only while no
passkey exists.

The local database starts empty. Real content exists only on the live site.

## Tests

`cd api && npm test` runs the API tests with Node's built-in test runner. The
`admin/tests/` and `mcp-server/tests/` folders have their own tests. See
[api/TESTING.md](api/TESTING.md).

## For AI assistants (MCP)

This project includes an MCP (Model Context Protocol) server that exposes records, essays, lists, news and blog posts for AI assistants — to search and copy. 

**Hosted endpoint:** `https://www.thejesuswebsite.org/mcp`

See [mcp-server/README.md](mcp-server/README.md) for setup and usage.

## Project rules and decisions

- [setup/Vibe_coding_rules.md](setup/Vibe_coding_rules.md) — the coding rules
  that comments cite, for example `(API-5)`.
- [setup/STYLE_GUIDE/INDEX.md](setup/STYLE_GUIDE/INDEX.md) — the visual style.
- [setup/Decisions_log.md](setup/Decisions_log.md) — why the project is built
  the way it is.
- [database/schema.sql](database/schema.sql) — the database schema.

## License

[CC BY-NC 4.0](LICENSE). You can share and adapt this work for non-commercial
use, with credit.
