# Explore Arunachal

Permit-aware trip planning for Arunachal Pradesh. Prototype for ADDOVEDI 2026, PS-05.

> Estimates only. We don't issue ILP or PAP. Always confirm permits on official portals.
> Homestays, fares and drive times in this project are sample data.

## Getting started

1. Install dependencies from the repository root: `npm run install-all`
2. Copy `server/.env.example` to `server/.env` and fill in every value
   (MongoDB Atlas URI, two different JWT secrets, ImageKit, OpenRouteService, `SEED_PASSWORD`).
   The server refuses to start and lists anything missing.
3. Load the sample data: `npm run seed --prefix server`
   (use `npm run seed:fresh --prefix server` to replace it later)
4. Start the client and API together: `npm run dev`

- Client: http://localhost:5173
- API health check: http://localhost:5000/api/health

The client uses the Vite development proxy to call the Express API at `/api`.

## Sample data

`npm run seed` inserts SAMPLE destinations, road segments (hill-adjusted hours and
indicative fares), permit rules, homestays and four demo accounts. Every sample
record has `isSample: true`. Demo logins (password = `SEED_PASSWORD`):

| Role      | Email                                   |
| --------- | --------------------------------------- |
| admin     | admin@explorearunachal.test             |
| host      | host.westkameng@explorearunachal.test   |
| host      | host.ziro@explorearunachal.test         |
| traveller | traveller@explorearunachal.test         |

### ⚠️ Re-check permit rules on the hackathon day

The ILP, PAP and Tawang local-permission rules in `server/src/seed/data/permitRules.js`
were written from public information and may be out of date. On the hackathon day,
the team must:

1. Open the official e-ILP portal (https://www.eilp.arunachal.gov.in) and the official
   Arunachal Pradesh tourism / government sources for PAP.
2. Compare documents, steps and links with the seeded rules and fix any differences.
3. Mark each rule verified from the admin panel, so travellers see today's
   "last verified" date.
