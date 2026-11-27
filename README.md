# StarlingX Horizon Demo (replica for POC testing)

> **Disclaimer:** Demo app with dummy data only. It is a functional clone of the screens and flows of the StarlingX Horizon dashboard (projects, users, instances, volumes, networks, images, hosts, alarms, software, data networks, events). It is not the real StarlingX product and has no OpenStack or StarlingX backend.

## What it is

- **Projects instead of tenants.** Users are added to projects with a role per project: `admin`, `member` or `reader`. Reader is read-only. Platform admins see every project.
- **Seeded data** (identical on every start, from a fixed seed): 14 projects, 120 users, 300 instances, 180 volumes, 41 networks, 12 images, 8 flavors, 8 hosts, 40 alarms, 60 events, 4 data networks, 3 releases and 6 patches.
- **Pages:**
  - Overview, Instances (launch, start, stop, reboot, delete), Volumes (create, attach, detach, delete), Networks (create, delete), Images.
  - Admin: Projects (create, enable or disable, delete, members) and Users (create, edit, delete).
  - Platform: Software Management (apply and remove patches), Host Inventory (lock and unlock hosts; 10 subpages: CPU functions, devices, filesystems, interfaces, Kubernetes labels, LLDP, memory, ports, sensors, storage), Data Networks (create, delete, add and remove VLAN, VXLAN or flat ranges).
  - Fault Management: Active Alarms (clear), Events (read-only log).
- **REST API** under `/api` with bearer-token auth, 51 endpoints. Lists accept `limit` and `marker` (maximum 2000 per page).
- **Access rules:**
  - A reader in a project gets 403 on every write.
  - Sessions expire after 50 minutes.
  - A password change ends that user's sessions.
  - When a project is disabled, members get 403. Admins still have access.
  - The project member list is admin-only.
  - Admin APIs return 403 to non-admins.
- **Security headers and rate limiting** are not set, as in the original StarlingX repos. Known gaps are listed in the report, not hidden.

## Accounts

**Password for every account: `Demo@123`**

- Platform admins: 10 accounts (role `admin`, see-all access).
- Members: the rest. Each member has one or more project roles, shown in the table.
- Disabled accounts (6) cannot sign in. Use an enabled account.
- Example admin for a full walk-through: `admin@starlingx-demo.example`.
- Example reader (read-only in one project): `ana.nakamura11@starlingx-demo.example`.

| Name | Email | Platform role | Status | Project roles |
|---|---|---|---|---|
| Demo Admin | admin@starlingx-demo.example | admin | enabled | none |
| Amara Schmidt | amara.schmidt58@starlingx-demo.example | admin | enabled | none |
| Ava Brown | ava.brown1@starlingx-demo.example | admin | enabled | none |
| Diego Kim | diego.kim96@starlingx-demo.example | admin | enabled | none |
| Lina Singh | lina.singh39@starlingx-demo.example | admin | enabled | none |
| Nadia Park | nadia.park115@starlingx-demo.example | admin | enabled | none |
| Ops Admin | ops.admin@starlingx-demo.example | admin | enabled | none |
| Platform Admin | platform.admin@starlingx-demo.example | admin | enabled | none |
| Ravi Romero | ravi.romero20@starlingx-demo.example | admin | enabled | none |
| Rosa Novak | rosa.novak77@starlingx-demo.example | admin | enabled | none |
| Aisha Brown | aisha.brown107@starlingx-demo.example | member | enabled | edge-ran (member), monitoring (member) |
| Aisha Muller | aisha.muller67@starlingx-demo.example | member | enabled | ci-cd (member), demo (reader), infra-prod (reader), storage-ceph (member) |
| Aisha Schmidt | aisha.schmidt27@starlingx-demo.example | member | enabled | service (member) |
| Amara Khan | amara.khan18@starlingx-demo.example | member | disabled | demo (member), dev-team-a (member), service (member) |
| Amara Lopez | amara.lopez98@starlingx-demo.example | member | enabled | demo (admin), edge-ran (admin), infra-staging (member), service (member) |
| Ana Mensah | ana.mensah51@starlingx-demo.example | member | enabled | finance-apps (member), telco-5g-core (member) |
| Ana Nakamura | ana.nakamura11@starlingx-demo.example | member | enabled | dev-team-a (member), edge-ran (admin), finance-apps (member), service (reader) |
| Ana Patel | ana.patel91@starlingx-demo.example | member | disabled | hr-portal (member), infra-staging (member) |
| Arjun Brown | arjun.brown70@starlingx-demo.example | member | enabled | ci-cd (member) |
| Arjun Chen | arjun.chen30@starlingx-demo.example | member | enabled | dev-team-b (admin) |
| Arjun Costa | arjun.costa110@starlingx-demo.example | member | enabled | demo (member), dev-team-b (reader), finance-apps (admin), service (member) |
| Ava Fischer | ava.fischer41@starlingx-demo.example | member | disabled | ci-cd (reader), demo (reader), infra-prod (admin), storage-ceph (member) |
| Ava Larsen | ava.larsen81@starlingx-demo.example | member | enabled | edge-ran (member), infra-prod (reader), infra-staging (member), service (member) |
| Chen Ivanova | chen.ivanova57@starlingx-demo.example | member | enabled | infra-prod (member), infra-staging (member), monitoring (reader), telco-5g-core (admin) |
| Chen Rahman | chen.rahman97@starlingx-demo.example | member | enabled | ci-cd (reader), demo (member), iot-gateway (member), service (admin) |
| Chen Rossi | chen.rossi17@starlingx-demo.example | member | enabled | dev-team-a (member), edge-ran (member), hr-portal (member), service (reader) |
| Diego Fischer | diego.fischer16@starlingx-demo.example | member | enabled | dev-team-b (member), edge-ran (member), finance-apps (member), service (admin) |
| Diego Okafor | diego.okafor56@starlingx-demo.example | member | enabled | demo (member), finance-apps (reader), infra-prod (reader), telco-5g-core (reader) |
| Elena Adeyemi | elena.adeyemi63@starlingx-demo.example | member | enabled | dev-team-a (member), monitoring (member), service (member) |
| Elena Chen | elena.chen23@starlingx-demo.example | member | enabled | dev-team-b (reader), infra-staging (member), telco-5g-core (reader) |
| Elena Rossi | elena.rossi103@starlingx-demo.example | member | enabled | dev-team-b (member), infra-staging (reader), telco-5g-core (member) |
| Eli Chen | eli.chen85@starlingx-demo.example | member | disabled | demo (admin), infra-prod (reader), infra-staging (admin) |
| Eli Novak | eli.novak5@starlingx-demo.example | member | enabled | infra-staging (admin) |
| Eli Rahman | eli.rahman45@starlingx-demo.example | member | enabled | edge-ran (admin) |
| Fatima Brown | fatima.brown95@starlingx-demo.example | member | enabled | edge-ran (member) |
| Fatima Garcia | fatima.garcia15@starlingx-demo.example | member | enabled | finance-apps (member), infra-prod (admin), monitoring (admin), telco-5g-core (member) |
| Fatima Mensah | fatima.mensah55@starlingx-demo.example | member | enabled | service (member), storage-ceph (reader) |
| Felix Moreau | felix.moreau112@starlingx-demo.example | member | enabled | dev-team-b (member), finance-apps (member), monitoring (member) |
| Felix Moreau | felix.moreau72@starlingx-demo.example | member | enabled | ci-cd (reader), telco-5g-core (member) |
| Felix Yilmaz | felix.yilmaz32@starlingx-demo.example | member | enabled | ci-cd (member), telco-5g-core (member) |
| Hana Nakamura | hana.nakamura101@starlingx-demo.example | member | enabled | dev-team-b (member), hr-portal (admin), infra-staging (reader), telco-5g-core (reader) |
| Hana Park | hana.park61@starlingx-demo.example | member | enabled | infra-staging (reader), storage-ceph (member) |
| Hana Rahman | hana.rahman21@starlingx-demo.example | member | enabled | infra-prod (reader), infra-staging (member) |
| Hugo Rossi | hugo.rossi38@starlingx-demo.example | member | enabled | dev-team-b (admin), finance-apps (member), infra-staging (member), monitoring (admin) |
| Hugo Rossi | hugo.rossi78@starlingx-demo.example | member | enabled | ci-cd (member) |
| Ines Ivanova | ines.ivanova113@starlingx-demo.example | member | enabled | demo (member), monitoring (reader) |
| Ines Ivanova | ines.ivanova73@starlingx-demo.example | member | enabled | demo (member), edge-ran (member) |
| Ines Novak | ines.novak33@starlingx-demo.example | member | enabled | dev-team-b (member), hr-portal (member), service (member) |
| Ivan Chen | ivan.chen54@starlingx-demo.example | member | enabled | infra-prod (member), monitoring (member) |
| Ivan Garcia | ivan.garcia94@starlingx-demo.example | member | enabled | infra-prod (admin), infra-staging (member), monitoring (member) |
| Ivan Yilmaz | ivan.yilmaz14@starlingx-demo.example | member | enabled | service (reader) |
| Jonas Costa | jonas.costa106@starlingx-demo.example | member | enabled | iot-gateway (admin), monitoring (member), service (member) |
| Jonas Patel | jonas.patel26@starlingx-demo.example | member | enabled | finance-apps (member), iot-gateway (admin), monitoring (reader), telco-5g-core (reader) |
| Jonas Yilmaz | jonas.yilmaz66@starlingx-demo.example | member | enabled | finance-apps (member) |
| Kofi Chen | kofi.chen34@starlingx-demo.example | member | disabled | hr-portal (member), infra-prod (member) |
| Kofi Park | kofi.park74@starlingx-demo.example | member | enabled | iot-gateway (admin), service (admin) |
| Kofi Walsh | kofi.walsh114@starlingx-demo.example | member | enabled | hr-portal (admin), infra-prod (admin), monitoring (reader) |
| Kwame Fischer | kwame.fischer62@starlingx-demo.example | member | enabled | infra-staging (admin), storage-ceph (member) |
| Kwame Haddad | kwame.haddad22@starlingx-demo.example | member | enabled | edge-ran (member), infra-staging (member), storage-ceph (member) |
| Kwame Kim | kwame.kim102@starlingx-demo.example | member | enabled | demo (admin), finance-apps (member), monitoring (admin), service (admin) |
| Leila Costa | leila.costa105@starlingx-demo.example | member | enabled | dev-team-a (reader) |
| Leila Garcia | leila.garcia65@starlingx-demo.example | member | enabled | ci-cd (admin), finance-apps (member), infra-staging (reader) |
| Leila Nakamura | leila.nakamura25@starlingx-demo.example | member | enabled | edge-ran (member), finance-apps (member), infra-prod (member), infra-staging (member) |
| Liam Mensah | liam.mensah82@starlingx-demo.example | member | enabled | infra-prod (member) |
| Liam Novak | liam.novak2@starlingx-demo.example | member | enabled | infra-staging (member), monitoring (member) |
| Liam Romero | liam.romero42@starlingx-demo.example | member | enabled | ci-cd (admin), monitoring (admin), storage-ceph (admin) |
| Lina Walsh | lina.walsh79@starlingx-demo.example | member | enabled | service (member) |
| Lukas Khan | lukas.khan9@starlingx-demo.example | member | enabled | ci-cd (member), demo (admin) |
| Lukas Singh | lukas.singh49@starlingx-demo.example | member | enabled | edge-ran (member), hr-portal (admin), monitoring (member), storage-ceph (admin) |
| Lukas Yilmaz | lukas.yilmaz89@starlingx-demo.example | member | enabled | dev-team-a (member), dev-team-b (member), iot-gateway (reader), service (member) |
| Marco Haddad | marco.haddad10@starlingx-demo.example | member | enabled | edge-ran (member), hr-portal (member), telco-5g-core (member) |
| Marco Moreau | marco.moreau50@starlingx-demo.example | member | enabled | edge-ran (member), infra-staging (member), iot-gateway (member), telco-5g-core (member) |
| Marco Moreau | marco.moreau90@starlingx-demo.example | member | enabled | demo (member), edge-ran (member), infra-staging (member) |
| Mateo Abbas | mateo.abbas24@starlingx-demo.example | member | enabled | dev-team-b (reader), hr-portal (admin), storage-ceph (reader), telco-5g-core (member) |
| Mateo Chen | mateo.chen104@starlingx-demo.example | member | enabled | finance-apps (member), telco-5g-core (member) |
| Mateo Yilmaz | mateo.yilmaz64@starlingx-demo.example | member | enabled | ci-cd (reader), dev-team-a (admin), infra-staging (member), storage-ceph (member) |
| Mei Brown | mei.brown29@starlingx-demo.example | member | enabled | infra-prod (reader), infra-staging (reader) |
| Mei Khan | mei.khan109@starlingx-demo.example | member | enabled | ci-cd (reader), demo (member), dev-team-a (reader), service (member) |
| Mei Muller | mei.muller69@starlingx-demo.example | member | enabled | dev-team-a (member) |
| Mia Moreau | mia.moreau4@starlingx-demo.example | member | enabled | demo (member), dev-team-a (member), edge-ran (reader), infra-staging (reader) |
| Mia Muller | mia.muller44@starlingx-demo.example | member | enabled | finance-apps (reader) |
| Mia Nakamura | mia.nakamura84@starlingx-demo.example | member | enabled | finance-apps (member) |
| Nadia Larsen | nadia.larsen35@starlingx-demo.example | member | enabled | finance-apps (member) |
| Nadia Schmidt | nadia.schmidt75@starlingx-demo.example | member | enabled | demo (reader) |
| Noah Lopez | noah.lopez43@starlingx-demo.example | member | enabled | infra-staging (member) |
| Noah Rahman | noah.rahman3@starlingx-demo.example | member | enabled | telco-5g-core (reader) |
| Noah Rahman | noah.rahman83@starlingx-demo.example | member | enabled | finance-apps (member), infra-prod (member) |
| Noor Ivanova | noor.ivanova8@starlingx-demo.example | member | enabled | dev-team-b (admin), infra-staging (admin), monitoring (reader), service (member) |
| Noor Muller | noor.muller48@starlingx-demo.example | member | disabled | dev-team-a (member), dev-team-b (member), monitoring (admin), storage-ceph (admin) |
| Noor Rossi | noor.rossi88@starlingx-demo.example | member | enabled | infra-staging (member), telco-5g-core (admin) |
| Omar Khan | omar.khan92@starlingx-demo.example | member | enabled | demo (member), dev-team-a (member), edge-ran (admin) |
| Omar Mensah | omar.mensah12@starlingx-demo.example | member | enabled | infra-staging (reader), iot-gateway (member), service (member), telco-5g-core (member) |
| Omar Rahman | omar.rahman52@starlingx-demo.example | member | enabled | finance-apps (admin), service (member), telco-5g-core (member) |
| Oscar Larsen | oscar.larsen116@starlingx-demo.example | member | enabled | dev-team-a (reader), infra-staging (member) |
| Oscar Moreau | oscar.moreau36@starlingx-demo.example | member | enabled | dev-team-b (admin), finance-apps (member), hr-portal (member) |
| Oscar Muller | oscar.muller76@starlingx-demo.example | member | enabled | dev-team-b (reader), edge-ran (member), hr-portal (admin), infra-staging (member) |
| Priya Novak | priya.novak46@starlingx-demo.example | member | enabled | demo (reader), service (admin) |
| Priya Park | priya.park6@starlingx-demo.example | member | enabled | demo (admin), dev-team-b (reader), hr-portal (admin), monitoring (member) |
| Priya Park | priya.park86@starlingx-demo.example | member | enabled | demo (admin), edge-ran (member), service (member) |
| Ravi Park | ravi.park60@starlingx-demo.example | member | enabled | ci-cd (admin), dev-team-a (member), monitoring (admin), service (member) |
| Ravi Walsh | ravi.walsh100@starlingx-demo.example | member | enabled | ci-cd (member), demo (member), infra-prod (reader), storage-ceph (member) |
| Rosa Nakamura | rosa.nakamura117@starlingx-demo.example | member | enabled | edge-ran (member), finance-apps (reader), hr-portal (member) |
| Rosa Silva | rosa.silva37@starlingx-demo.example | member | enabled | edge-ran (admin), infra-prod (admin) |
| Sam Haddad | sam.haddad87@starlingx-demo.example | member | enabled | demo (reader), storage-ceph (admin) |
| Sam Silva | sam.silva7@starlingx-demo.example | member | enabled | edge-ran (member), service (admin) |
| Sam Walsh | sam.walsh47@starlingx-demo.example | member | enabled | ci-cd (member), telco-5g-core (reader) |
| Samir Park | samir.park40@starlingx-demo.example | member | enabled | ci-cd (member), iot-gateway (member), service (admin), storage-ceph (admin) |
| Samir Yilmaz | samir.yilmaz80@starlingx-demo.example | member | enabled | demo (member), service (reader) |
| Sofia Fischer | sofia.fischer19@starlingx-demo.example | member | enabled | infra-staging (member), iot-gateway (member) |
| Sofia Haddad | sofia.haddad59@starlingx-demo.example | member | enabled | demo (admin), dev-team-b (member), edge-ran (member), service (reader) |
| Sofia Mensah | sofia.mensah99@starlingx-demo.example | member | enabled | infra-prod (admin), infra-staging (reader), service (member) |
| Tomas Dubois | tomas.dubois68@starlingx-demo.example | member | enabled | infra-staging (admin) |
| Tomas Park | tomas.park28@starlingx-demo.example | member | enabled | hr-portal (member), infra-prod (member) |
| Tomas Singh | tomas.singh108@starlingx-demo.example | member | enabled | demo (member), edge-ran (admin), telco-5g-core (member) |
| Yuki Novak | yuki.novak53@starlingx-demo.example | member | enabled | demo (reader), finance-apps (member), monitoring (member), service (member) |
| Yuki Silva | yuki.silva13@starlingx-demo.example | member | enabled | ci-cd (admin), edge-ran (member), monitoring (admin), storage-ceph (reader) |
| Yuki Silva | yuki.silva93@starlingx-demo.example | member | enabled | demo (member), monitoring (member), service (admin), storage-ceph (member) |
| Zara Adeyemi | zara.adeyemi71@starlingx-demo.example | member | enabled | edge-ran (member), finance-apps (admin), telco-5g-core (member) |
| Zara Haddad | zara.haddad111@starlingx-demo.example | member | enabled | finance-apps (member) |
| Zara Muller | zara.muller31@starlingx-demo.example | member | enabled | infra-prod (admin), infra-staging (admin), monitoring (admin) |

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

Data is held in memory and re-seeded on every start. Changes made during testing are lost on restart or redeploy. That is intentional, so each POC run starts from the same state. Sessions are also in memory, so a restart signs everyone out.

## Files

- `server.js`: Express API, auth, access rules, and static file serving
- `seed.js`: deterministic seed data
- `public/`: single-page frontend (`index.html`, `app.js`)
- `scripts/smoke-test.js`: end-to-end API check
