# Cloud host on Oracle Always Free (backend on a VM, database stays on the QNAP)

**Status: prepared, not yet deployed.** Decided by the owner on 2026-11-12 (work plan todos 19
and 44). Nothing in this runbook has been run on a real VM yet; each step says how to check it.
Update this file with what actually happened the first time through.

## What this is, and what it is not

- The backend and the web app run in one container on an Oracle Always Free VM in Frankfurt.
- PostgreSQL stays on the QNAP at home. The VM reaches it over Tailscale.
- Phones and browsers reach the VM over Tailscale too (`https://<vm>.<tailnet>.ts.net`). No port
  is open to the public internet.
- **The home setup stays as it is, as the backup.** The home PC's Docker or SMS Lite install
  keeps working against the same database. The cloud VM is an additional way in.

It does not remove the dependency on home: the QNAP and the home internet line must be up. It
removes the dependency on the home *PC* being switched on.

## Before any student data flows through the VM

1. Confirm that Oracle's data-processing agreement covers Always Free accounts.
2. Confirm that ΜΙΕΕΚ policy allows student data to be processed on that provider.

Both were open when the decision was made. Until they are settled, test with a throwaway
database, not the QNAP one.

## 1. Oracle account and VM (owner)

1. Sign up for Oracle Cloud Free Tier. **Choose Frankfurt (or another EU region) as the home
   region**: Always Free resources exist only in the home region and it cannot be changed later.
   A card and a phone number are needed.
2. Create a compute instance: Ubuntu 24.04, shape `VM.Standard.A1.Flex` (ARM), 1 OCPU and 6 GB
   are plenty. If the console answers "out of host capacity", try another availability domain,
   try again later, or use `VM.Standard.E2.1.Micro` (AMD, 1 GB) as the fallback.
3. Keep the default security list: inbound SSH (22) only. Do not open 80, 443 or 8000.
4. Note for later: Oracle reclaims an Always Free instance whose CPU, network and (on A1) memory
   all stay under 20 % for 7 days. A small idle app is below that. Decide how to handle it once
   real usage is known (see "Open points").

Check: `ssh ubuntu@<public-ip>` works; `uname -m` prints `aarch64` on A1.

## 2. Tailscale on the VM

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --accept-routes --hostname sms-cloud
```

`--accept-routes` is what lets the VM use the home subnet route to the QNAP (`172.16.0.2/32`,
advertised by the home subnet router; see `ANDROID_TAILSCALE_GUIDE.md`).

Check: `tailscale status` lists the VM; `nc -vz 172.16.0.2 5432` connects. Then close SSH on
the public address if you like and use `ssh ubuntu@sms-cloud` over the tailnet instead.

## 3. Docker and the app

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu && newgrp docker

git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git sms && cd sms
git checkout v1.x.x                 # the SAME release the home install runs
cd infra/docker/cloud
cp .env.cloud.example .env && nano .env
docker compose -f docker-compose.cloud.yml up -d --build
```

The image is built on the VM itself. It is known to build for arm64: CI builds it with
`docker-publish.yml` (`dry_run`, `platforms=linux/arm64`), where every Python dependency came as
a ready-made arm64 wheel.

Fill in `.env` with the QNAP database values (the same ones the home install uses), a new
`SECRET_KEY`, and the VM's tailnet name in `TRUSTED_HOSTS` and `CORS_ORIGINS`.

Check:

```bash
docker compose -f docker-compose.cloud.yml ps          # healthy
curl -fsS http://127.0.0.1:8000/health                 # "status":"healthy", "dialect":"postgresql"
docker compose -f docker-compose.cloud.yml logs sms | grep -i migration
```

If the container cannot reach `172.16.0.2` although the VM can (step 2), the container's
traffic is not using the Tailscale route. Run `sudo tailscale up --accept-routes
--snat-subnet-routes=true` again and, if that is not it, look at `ip rule` / the Docker bridge
before trying anything broader. Do not switch the container to host networking without first
making sure nothing but loopback can reach port 8000.

## 4. HTTPS for the tailnet

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:8000
```

This gives `https://sms-cloud.<tailnet>.ts.net` with a real certificate, reachable only from
devices on the tailnet. (Do not use `tailscale funnel`: that would publish the app to the
internet.)

Check from a laptop on the tailnet: the login page opens at that address, login works, and a
page that loads data (Students) shows it.

## 5. Phones

In the Android app's server setting, enter `https://sms-cloud.<tailnet>.ts.net`. The phone must
have Tailscale on, as it does today for the home address.

**Switching back (the backup):** enter the home address again. Both hosts use the same database,
so nothing is lost by switching; people log in again because each host signs its own sessions.

## Running both hosts

- Keep both on the **same release**. Migrations are additive, so an older host keeps working
  against a database a newer one has upgraded, but it will not have the newer features.
- Whichever host starts first with a new release applies its migrations.
- Each host runs its own scheduled jobs (export clean-up, course activation). They are safe to
  run twice.

## Updating the VM

```bash
cd ~/sms && git fetch --tags && git checkout v1.x.y
cd infra/docker/cloud && docker compose -f docker-compose.cloud.yml up -d --build
```

## Open points (settle on the real VM, then record here)

- Latency of VM → QNAP queries over Tailscale (the ORM makes many small queries). If pages are
  slow, the alternative is PostgreSQL on the VM with the QNAP as the backup target; that puts
  the data on the provider and needs a nightly `pg_dump` and a tested restore first.
- Idle reclamation: whether real usage keeps the instance above Oracle's thresholds, and
  whether a Pay As You Go upgrade (the resources stay free) exempts it.
- Whether Tailscale's free Personal plan (licensed for non-commercial use) fits a college's app.
- The paid fallback if free hosting does not hold: a small Hetzner VM, about €5.50–6.50 a month.
