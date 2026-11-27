# StarlingX Horizon Demo (replica for POC testing)

> **Disclaimer:** Demo app with dummy data only. It is a functional clone of the screens and flows of the StarlingX Horizon dashboard (projects, users, instances, volumes, networks, images, hosts, alarms). It is not the real StarlingX product and has no OpenStack or StarlingX backend.

## What it is

- **Projects instead of tenants.** Users are added to projects with a role per project (`admin`, `member`, `reader`). Platform admins see every project.
- **Seeded data** (identical on every start, from a fixed seed):
  - 14 projects, 120 users (3 platform admins), 300 instances, 180 volumes, 41 networks, 12 images, 8 flavors, 8 hosts, 40 alarms.
- **Pages:** Overview, Instances (launch, start, stop, reboot, delete), Volumes (create, attach, detach, delete), Networks (create, delete), Images, and admin-only:
  - Projects (create, enable/disable, delete, members) and Users (create, edit, delete)
  - Platform: Software Management (apply and remove patches), Host Inventory (lock and unlock hosts; 10 subpages: CPU functions, devices, filesystems, interfaces, Kubernetes labels, LLDP, memory, ports, sensors, storage), Data Networks (create, delete, add and remove VLAN/VXLAN ranges)
  - Fault Management: Active Alarms (clear), Events (read-only log)
- **REST API** under `/api` with bearer-token auth, 51 endpoints. Use the browser UI or the API.
- **No planted vulnerabilities.** Access rules are enforced. Members see only their own projects, and admin APIs return 403 to members.

## Demo accounts
# URL https://starlingx-horizon-demo.onrender.com
Password for every account: `Demo@123`

| Role | Email |
|---|---|
| Platform admin | admin@starlingx-demo.example |
| Platform admin | ops.admin@starlingx-demo.example |
| Platform admin | platform.admin@starlingx-demo.example |
| Member (2 projects) | liam.novak2@starlingx-demo.example |
| Member (1 project) | noah.rahman3@starlingx-demo.example |
| Member (4 projects) | mia.moreau4@starlingx-demo.example |
| Member (1 project) | eli.novak5@starlingx-demo.example |

Other members follow the pattern `first.last<n>@starlingx-demo.example`. Their membership counts are visible in the Users page.

## Run locally

```bash
npm install
npm start            # http://localhost:3000
```

## Smoke test

```bash
npm run smoke        # runs against http://localhost:3000
```

Run it against a fresh server. The test creates and deletes records, and it prints PASS or FAIL for each check.

## Deploy on Render (free web service)

1. Push this folder to a GitHub repository.
2. In Render, choose *New > Blueprint* and select the repo (it uses `render.yaml`), or create a Web Service with build command `npm install` and start command `node server.js`.
3. Use the service URL as the Perfai target.

## Data persistence

Data is held in memory and re-seeded on every start. Changes made during testing are lost on restart or redeploy. That is intentional, so each POC run starts from the same state.

## Files

- `server.js`: Express API, auth, and static file serving
- `seed.js`: deterministic seed data
- `public/`: single-page frontend (`index.html`, `app.js`)
- `scripts/smoke-test.js`: end-to-end API check
