# Cloud host on Oracle Always Free (backend on a VM, database stays on the QNAP)

**Status: running since 2026-11-13** at `https://sms-cloud.tail85a28b.ts.net` (tailnet devices
only). Decided by the owner on 2026-11-12 (work plan todos 19 and 44). This runbook was written
before the first deployment and corrected with what actually happened; the differences are
marked "First run".

## What this is, and what it is not

- The backend and the web app run in one container on an Oracle Always Free VM in Frankfurt
  (`sms-cloud`: ARM `VM.Standard.A1.Flex`, 1 OCPU, 6 GB, Ubuntu 24.04).
- PostgreSQL stays on the QNAP at home. The VM reaches it over Tailscale, at the QNAP's own
  tailnet address.
- Phones and browsers reach the VM over Tailscale too. No port is open to the public internet,
  and the database port is not forwarded on the home router (checked from the VM: closed).
- **The home setup stays as it is, as the backup.** The home PC's Docker or SMS Lite install
  keeps working against the same database. The cloud VM is an additional way in.

It does not remove the dependency on home: the QNAP and the home internet line must be up. It
removes the dependency on a home *PC* being switched on.

## Confirmations (owner)

1. Oracle's Data Processing Agreement (14 August 2025) and the Cyprus Cloud Services Agreement
   (22 June 2023) were read on 2026-11-13. Neither excludes free accounts; both rule out
   regulated health data, which the app does not record. The free account's own order record
   cannot be read by automation; only the owner can open it in the console.
2. ΜΙΕΕΚ policy: decided by the owner on 2026-11-20. No approval from the institution is needed,
   because the Cyprus Ministry of Education follows the EU rules on data for educational
   purposes, **as long as the database stays private**: the app only on the tailnet, the
   database port never on a public address. Exposing either reopens the question.

Both were open when the VM went live; the owner chose to connect the real database straight
away. The data itself is stored only on the QNAP; the VM processes it in memory.

## 1. Oracle account and VM

1. Sign up for Oracle Cloud Free Tier. **Choose Frankfurt (or another EU region) as the home
   region**: Always Free resources exist only in the home region and it cannot be changed later.
   A card and a phone number are needed. The account is usable within minutes.
2. Compute → Instances → Create instance: name `sms-cloud`, image Canonical Ubuntu 24.04, shape
   Ampere `VM.Standard.A1.Flex` with 1 OCPU and 6 GB ("Always Free-eligible"), capacity type
   on-demand. Networking: create a new virtual cloud network and a new public subnet. SSH keys:
   "Generate a key pair for me" and **save the private key**; it is not offered again.
3. Keep the default security list: inbound SSH (22) only. Do not open 80, 443 or 8000.

**First run:**
- *"Out of host capacity"* for A1 in AD-2, with and without a fixed fault domain. AD-1 worked a
  minute later. Try the other availability domains before giving up; the AMD
  `VM.Standard.E2.1.Micro` (1 GB) is the fallback.
- *The wizard would not assign a public IPv4 address* to a subnet it was about to create ("You
  must select a public subnet"). Create the instance without one, then: instance → Networking →
  the primary VNIC → IP administration → the private address row → Edit → **Ephemeral public
  IP**.
- Keep the private key in `%USERPROFILE%\.ssh\` with access for your own account only
  (`icacls <file> /inheritance:r /grant:r "%USERNAME%:(R)"`), not in a synced folder.

Check: `ssh -i <key> ubuntu@<public-ip>` works; `uname -m` prints `aarch64`.

## 2. Tailscale: the VM and the QNAP

On the VM:

```bash
curl -fsSL https://tailscale.com/install.sh | sudo sh
sudo tailscale up --hostname sms-cloud        # prints a login link; approve it in the browser
```

On the QNAP: install Tailscale and sign in with the same account, so the QNAP is a tailnet
device of its own (`konaki`, `100.85.132.36` on the owner's tailnet). The VM then connects to
that address and **no home PC has to be on**.

**First run:** the VM first reached the QNAP through the home PC `REC`, which advertises the
subnet route `172.16.0.2/32` (that needs `sudo tailscale set --accept-routes=true` on the VM).
It worked, but only while that PC was on, which defeats the purpose; it stays in the VM's `.env`
as a commented fallback. Round trip to the QNAP: about 60 ms direct, about 100 ms through `REC`.

Check on the VM: `tailscale status` lists the QNAP as online, and
`timeout 6 bash -c '</dev/tcp/<qnap-tailnet-ip>/55433' && echo open`.

## 3. Docker and the app

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu

git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git sms && cd sms
git checkout <commit or tag>        # the SAME release the home install runs
cd infra/docker/cloud
cp .env.cloud.example .env && chmod 600 .env && nano .env
sudo docker compose -f docker-compose.cloud.yml up -d --build
```

In `.env`: a new `SECRET_KEY`, the QNAP's tailnet address and port **55433** (the port its
PostgreSQL container publishes; it is not 5432), the database name and user the home installs
use, the password **in single quotes**, and the VM's tailnet name in `TRUSTED_HOSTS` and
`CORS_ORIGINS`.

The image is built on the VM itself (about 10 minutes on one CPU; later builds reuse the
frontend layer and take a minute or two).

Check:

```bash
sudo docker ps                                  # sms-cloud ... (healthy) 127.0.0.1:8000->8000/tcp
curl -fsS http://127.0.0.1:8000/health          # "status":"healthy", database dialect postgresql
```

**First run:** a container on the default Docker bridge reached the QNAP through Tailscale
without any extra network setting.

## 4. HTTPS for the tailnet

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:8000
```

**First run:** Serve has to be enabled once for the tailnet; the command prints the link.

This gives `https://sms-cloud.<tailnet>.ts.net` with a real certificate, reachable only from
devices on the tailnet. (Do not use `tailscale funnel`: that would publish the app to the
internet.)

## 5. Phones

In the Android app's server setting, enter `https://sms-cloud.<tailnet>.ts.net`. The phone must
have Tailscale on, as it does today for the home address.

**Switching back (the backup):** enter the home address again. Both hosts use the same database,
so nothing is lost by switching; people log in again because each host signs its own sessions.

## Speed: the database is 60 ms away

At home a database round trip takes under a millisecond. From Frankfurt it takes about 65 ms,
and a stock request made about nine of them: a connection test, `BEGIN`, the user, two to four
permission lookups, the data, `ROLLBACK`. The first pages took over 3 seconds.

`docker-compose.cloud.yml` therefore turns on three switches that exist for this case and are
off everywhere else (`src/backend/remote_db_tuning.py`, `src/backend/permission_cache.py`):

| Variable | Cloud value | What it removes |
|---|---|---|
| `DB_PRE_PING_IDLE_SECONDS` | `20` | The connection test, unless the connection sat idle for 20 s |
| `DB_AUTOCOMMIT_READS` | `true` | `BEGIN` and `ROLLBACK` on GET/HEAD/OPTIONS requests |
| `PERMISSION_CACHE_TTL_SECONDS` | `30` | The permission lookups, for 30 s per user and permission |

Measured on the VM: a read request's session with one query went from 239 ms to 72 ms, a write
session from 239 ms to 179 ms.

What they cost: a permission changed **on the home install** reaches the cloud host up to 30 s
later (changed on the cloud host itself, at once); a read request that also writes is no longer
undone as a whole if it fails half-way; and a connection that died within the last 20 s makes
one request fail before it is replaced. To switch one off, set it to `0` / `false` in `.env`
and run `up -d` again.

**"Slow query" in the log.** The distance also decides what a slow statement is. The plainest
statements take 118 to 197 ms from this host (measured over 50 minutes on v1.18.72), so the
compose file sets `SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS=500` here; everywhere else the limit is
300 ms. Up to v1.18.72 a second monitor warned at a fixed 100 ms, which on this host was every
health check: 132 of 133 warnings in those 50 minutes. Now one setting decides and one line
is written per slow statement (`Slow query detected (… ms)`), so a warning in
`sudo docker logs sms-cloud` is worth reading again.

## Running both hosts

- Keep both on the **same release**. Migrations are additive, so an older host keeps working
  against a database a newer one has upgraded, but it will not have the newer features.
- Whichever host starts first with a new release applies its migrations.
- Each host runs its own scheduled jobs (export clean-up, course activation). They are safe to
  run twice.

## Backups

The VM makes one encrypted backup of the shared database a day and keeps the newest 30
([what it does and how to restore](../admin/BACKUP_AND_RESTORE.md)). Backups and their key are on
the data volume, so they outlive a rebuild of the image. This is the copy of the database that
is not on the NAS; it is also only on the VM until somebody fetches one.

```bash
# What is there, and what the server said about it
sudo docker exec sms-cloud ls -la /data/backups/database
sudo docker logs sms-cloud 2>&1 | grep "Automatic database backup"

# A copy for another machine: the newest backup, and (once) the key
sudo docker cp sms-cloud:/data/backups/database ./sms-backups
sudo docker cp sms-cloud:/data/.keys/master.key ./sms-master.key
```

Keep the key apart from the backups. `AUTO_BACKUP_ENABLED=false` in `.env` switches the backup
off (the page then says so).

## Watching the server

Nothing on the VM can report that the VM has stopped, so something outside has to notice. The
server sends a signal to a monitoring service at a fixed pace, for as long as three things
hold: it runs, the database answers, and the daily backup is in order. When the signal stops,
the service tells you. Only the signal leaves the VM; nothing can reach in.

Any "dead man's switch" service works. With [healthchecks.io](https://healthchecks.io) (free
for this use):

1. Create an account and a check, for example "SMS cloud server". Schedule: **period 1 hour,
   grace time 1 hour**. Under Integrations, make sure your email is on.
2. Copy the check's ping address (`https://hc-ping.com/<id>`).
3. On the VM, add two lines to `~/sms/infra/docker/cloud/.env`:

   ```bash
   MONITOR_PING_URL=https://hc-ping.com/<id>
   MONITOR_FAIL_URL=https://hc-ping.com/<id>/fail
   ```

4. `sudo docker compose -f docker-compose.cloud.yml up -d`, then, about three minutes later:

   ```bash
   sudo docker logs sms-cloud 2>&1 | grep -i heartbeat
   ```

   The log says `Heartbeat to the monitoring service scheduled: every 60 minutes`, and the
   check on the service's page turns green.

What you are told, and when:

| What happens | What the service sees | You hear |
|---|---|---|
| The VM, the container or the application stops | the signals stop | after the period and the grace time (up to 2 hours) |
| The database does not answer (the NAS or the tailnet is down) | a failure report | at once, at the next signal |
| The daily backup failed, or the newest one is more than 27 hours old | a failure report | at once, at the next signal |

The administrators also get a notice in the application's bell when a backup fails (at most
one a day). The address is a secret of sorts: whoever has it can send the signal. It is in
`.env` only, never in the repository, and the application does not write it to its log.
`MONITOR_PING_MINUTES` changes the pace (default 60, minimum 5); set the period of the check
to match.

To try the alarm: `sudo docker stop sms-cloud`, wait for the email, `sudo docker start sms-cloud`.
A quicker test that keeps the app up: send one request to `MONITOR_FAIL_URL` from the VM. The
check turns DOWN and the e-mail comes at once. Then send one to `MONITOR_PING_URL`, and the
check turns UP again with a second e-mail. Tried on 2026-11-20 (DOWN at 12:36 UTC, UP at
12:38 UTC); the owner received both e-mails.

## Mail

The activation e-mail for an approved account, and the other notices, go through the SMTP
settings saved under Control Panel > Email. In the Docker edition they are kept on the data
volume (`/data/smtp_override.json`), so they survive an update. The password in that file is
encrypted with the VM's `SECRET_KEY`: a copy from another machine cannot be read, so enter the
settings on the VM itself, or save them through the application's own `smtp_override.save()`
inside the container. A saved file is loaded when the app starts.

The VM uses the same Brevo relay as the home installation (`smtp-relay.brevo.com:587`), set
up on 2026-11-20. Brevo only accepts SMTP logins from authorised IP addresses. A new address
is refused with `525 5.7.1 Unauthorized IP address`, and Brevo e-mails the account owner a
"Verify a new IP" alert with a button to authorise it. The VM's public address
`141.147.0.14` is authorised. If that address ever changes (see "Open points"), mail stops
until the new one is authorised under Brevo > Security > Authorised IPs.

## Updating the VM

```bash
cd ~/sms && git fetch --tags origin && git checkout <commit or tag>
cd infra/docker/cloud && sudo docker compose -f docker-compose.cloud.yml up -d --build
```

## Open points

- The free account's order record (under "Confirmations"), which only the owner can read.
- Idle reclamation: Oracle reclaims an Always Free instance whose CPU, network and (on A1)
  memory all stay under 20 % for 7 days. Whether real usage keeps this VM above that, and
  whether a Pay As You Go upgrade (the resources stay free) exempts it, is not known yet.
- The public address is "ephemeral": Oracle can release it (certainly when the instance is
  terminated or the address is unassigned; it survived a reboot on 2026-11-13). SSH can reach
  the VM over the tailnet as `ubuntu@sms-cloud` instead. Outgoing mail cannot avoid it: Brevo
  sees the mail coming from this address and only accepts it while the address is authorised
  (see "Mail"). A reserved public IP in Oracle would remove that risk.
- Restart test, 2026-11-13: after `sudo systemctl reboot` (new kernel) the container, Tailscale
  and the HTTPS address were back within about a minute with no manual step.
- ~~The Tailscale node key expires after about six months unless key expiry is disabled for
  the VM and the QNAP in the Tailscale admin console.~~ Disabled for both.
- Whether Tailscale's free Personal plan (licensed for non-commercial use) fits a college's app.
- If the speed is still not enough: PostgreSQL on the VM with the QNAP as the backup target.
  That stores the data at the provider and needs a nightly `pg_dump` and a tested restore first.
- The paid fallback if free hosting does not hold: a small Hetzner VM, about €5.50–6.50 a month.
