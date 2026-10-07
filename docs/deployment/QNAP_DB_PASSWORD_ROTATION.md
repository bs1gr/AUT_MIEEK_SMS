# Rotating the QNAP PostgreSQL Password

**Applies to**: the shared QNAP PostgreSQL (`sms-postgres-qnap`, `172.16.0.2:55433`, database
`student_management`, role `sms_user`) and every SMS install that connects to it.
**Last performed**: 2026-10-07. The procedure below is the one that was used, including the
mistakes made along the way and how to recover from them.

> **Never write the password into this repository.** The repo is public. The 2026-10-07
> rotation was needed because the previous password had been committed to several guides.
> Keep it in a password manager, and only in the git-ignored `.env` files and Lite
> credential files listed below.

---

## 1. Where the password lives

The Android app never holds the database password. It talks only to a backend, and the
backend connects to PostgreSQL. So a rotation touches the database and every backend, and
never the phones.

| # | Place | What holds the password | How to update |
|---|---|---|---|
| 1 | **PostgreSQL** in container `sms-postgres-qnap` | the `sms_user` role | §4: `\password sms_user` |
| 2 | QNAP: `/share/CACHEDEV1_DATA/Container/AUT_MIEEK_SMS/.env.qnap.postgres-only` | `POSTGRES_PASSWORD=` | §5 |
| 3 | Each Docker host (REC, laptop): `config\.env` (installed app: `C:\Program Files\SMS\config\.env`) | `POSTGRES_PASSWORD=` **and** the password inside `DATABASE_URL=` | §6 |
| 4 | Native dev checkout: `src\backend\.env` | `POSTGRES_PASSWORD=` | §6 |
| 5 | Each SMS Lite PC: `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\` | Lite's QNAP credentials file | §7 |

Item 2 has no effect on the running database: `POSTGRES_PASSWORD` is applied only when the
container initialises an empty data directory. Update it anyway, so the file matches the
database if the container is ever rebuilt. The `manage-qnap-postgres-only.sh psql-url` helper
also reads it.

---

## 2. Before you start

- **A new password.** Use one that needs no URL encoding (letters, digits, `-`, `_`):
  ```powershell
  python -c "import secrets; print(secrets.token_urlsafe(24))"
  ```
  Store it in your password manager first. Longer is better. The 2026-10-07 password has
  8 characters, which is acceptable on the LAN but should be lengthened before any cloud
  exposure (plan todo 19).
- **QNAP administrator access**: either SSH, or the QTS web UI with Container Station.
- **A maintenance window.** Once the password changes, every backend fails on its next new
  database connection until its config is updated.

---

## 3. Stop the backends

On each host: Docker `.\infra\scripts\dev\DOCKER.ps1 -Stop`, Native `.\infra\scripts\dev\NATIVE.ps1 -Stop`,
and close SMS Lite.

---

## 4. Change the password in PostgreSQL

### Option A: SSH (used on 2026-10-07)

```powershell
ssh admin@172.16.0.2
```

- The prompt asks for the **QNAP (QTS) administrator password**, not the database password.
- QNAP opens a console menu first. Press **Q**, then **Y**, to reach the shell (`[~] #`).

Open `psql` inside the container:

```sh
docker exec -it sms-postgres-qnap psql -U sms_user -d student_management
```

`docker exec` connects over the container's local socket. On 2026-10-07 it asked for no
password, so you cannot lock yourself out this way: if anything goes wrong, open it again.

In `psql`:

```sql
\password sms_user
```

Type the new password twice; nothing is echoed. Then confirm it is stored as SCRAM:

```sql
SELECT rolname, left(rolpassword, 14) FROM pg_authid WHERE rolname = 'sms_user';
```

Expected: `sms_user | SCRAM-SHA-256$`. Leave `psql` with `\q`.

### Option B: no SSH

QTS → **Container Station** → **Containers** → `sms-postgres-qnap` → **Execute / Terminal**,
command `sh`. Then run `psql -U sms_user -d student_management` and the same `\password sms_user`.

---

## 5. Update the QNAP env file

Run this in the QNAP shell (`[~] #`, **not** inside `psql`). Paste **one line at a time**.

```sh
F=/share/CACHEDEV1_DATA/Container/AUT_MIEEK_SMS/.env.qnap.postgres-only
```

If the path differs, find the file:
`find /share -maxdepth 4 -name .env.qnap.postgres-only 2>/dev/null`.

List which lines hold secrets, with values hidden (normally only `POSTGRES_PASSWORD`):

```sh
grep -n -i 'pass\|DATABASE_URL' "$F" | sed 's/=.*/=…/'
```

Back up the file, then read the new password without echoing it or leaving it in shell history:

```sh
cp "$F" "$F.bak"
```

```sh
read -s -p "New password: " NEWPW; echo
```

Now type the password and press Enter. Then rewrite the line:

```sh
awk -v pw="$NEWPW" '/^POSTGRES_PASSWORD=/{print "POSTGRES_PASSWORD=" pw; next} {print}' "$F.bak" > "$F"; unset NEWPW
```

Verify that the line count is unchanged and the line is present:

```sh
wc -l "$F" "$F.bak"; grep '^POSTGRES_PASSWORD=' "$F" | sed 's/=.*/=****/'
```

Expected: equal line counts and `POSTGRES_PASSWORD=****`. Then delete the backup, which holds
the old password:

```sh
rm "$F.bak"
```

The container does not need a restart.

---

## 6. Update Docker and Native hosts

Run this in PowerShell on each host. It asks for the password with a hidden prompt, so the
value never appears on screen or in history. It updates `POSTGRES_PASSWORD` and the
URL-encoded password inside `DATABASE_URL`. Adjust the paths in the `foreach` list. On the
laptop, use `C:\Program Files\SMS\config\.env` (you may need an elevated PowerShell).

```powershell
$sec = Read-Host "New sms_user password" -AsSecureString
$p = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$enc = [uri]::EscapeDataString($p)
foreach ($f in 'D:\SMS\student-management-system\config\.env', 'D:\SMS\student-management-system\src\backend\.env') {
  if (Test-Path $f) {
    $t = Get-Content $f -Raw
    $t = $t -replace '(?m)^POSTGRES_PASSWORD=.*$', ('POSTGRES_PASSWORD=' + $p.Replace('$', '$$'))
    $t = $t -replace '(?m)^(DATABASE_URL=postgresql[^:]*://sms_user:)[^@]*@', ('${1}' + $enc.Replace('$', '$$') + '@')
    Set-Content $f $t -NoNewline -Encoding utf8
    "updated: $f"
  }
}
Remove-Variable p, enc, sec
```

Paste the whole block, and type the password only when the `New sms_user password` prompt
appears.

---

## 7. Update each SMS Lite install

On every PC running SMS Lite against the QNAP, re-run the installer's credential script:

```powershell
& "<install dir>\SaveLiteEditionQnapCredentials.ps1" -InstallPath "<install dir>" `
  -PgHost "172.16.0.2" -PgPort "55433" -PgDb "student_management" `
  -PgUser "sms_user" -PgPass "<new password>" -PgSSLMode "disable"
```

Until you do, Lite stops at its **"SMS Lite — QNAP"** Retry/Cancel dialog. With QNAP
credentials present, Lite never falls back to a local database.

---

## 8. Verify

**The old password is rejected and the new one works.** Run this from the repo root on any
host with the repo's Python environment. It reads the password from the env file and
never prints it:

```powershell
python -I -c "
import re, psycopg
for f in ('config/.env', 'src/backend/.env'):
    pw = re.search(r'(?m)^POSTGRES_PASSWORD=(.*)$', open(f, encoding='utf-8').read()).group(1).strip()
    try:
        with psycopg.connect(host='172.16.0.2', port=55433, dbname='student_management', user='sms_user', password=pw, connect_timeout=8) as c:
            print(f, 'login OK,', c.execute('select count(*) from students').fetchone()[0], 'students')
    except psycopg.OperationalError as e:
        print(f, 'login FAILED:', str(e).strip().splitlines()[-1])
"
```

To confirm the old password is dead, run the same connect with the old value. Expected:
`password authentication failed for user "sms_user"`.

**The backends start.** From the repo folder:

```powershell
cd D:\SMS\student-management-system
.\infra\scripts\dev\DOCKER.ps1 -Start
Invoke-RestMethod http://localhost:8080/health
```

The health payload should report the database as connected. The **System** page should show
the green "Remote DB connected (QNAP/VPN)" badge.

**No copy of the old password is left in the repo:**

```powershell
git grep -n -I -e '<old password>' -- .
```

Replace any hit with a placeholder such as `<QNAP_DB_PASSWORD>`. Scripts must not carry a
built-in fallback password; they should require `DATABASE_URL`. The old value stays in git
history, where after the rotation it opens nothing.

---

## 9. Problems seen on 2026-10-07, and fixes

| Symptom | Cause | Fix |
|---|---|---|
| `ssh admin@172.16.0.2` → `Permission denied` | The database password was typed; SSH wants the QTS administrator password | Use the QTS password. Also check the account is in **administrators**, that SSH is enabled (Control Panel → Network & File Services → Telnet/SSH), and that repeated failures have not blocked your IP (Control Panel → Security → Network Access Protection) |
| Prompt changes to `student_management-#` after typing `find …` | A shell command was typed inside `psql`, which waits for the rest of an SQL statement. Nothing ran | `\r` to clear the buffer, `\q` to leave `psql`, then run the command at `[~] #` |
| After pasting several lines, the shell shows `>` and the env file is not updated | `read -s` consumed the next pasted line as the "password" | **Ctrl+C**, check the file with `wc -l "$F" "$F.bak"` (restore with `cp "$F.bak" "$F"` if needed), then repeat §5 one line at a time |
| `DOCKER.ps1 … is not recognized` | PowerShell was in `C:\Users\<you>`, not the repo | `cd D:\SMS\student-management-system` first |
| `Invoke-RestMethod http://localhost:8080/health` → connection refused | Docker is not running | Start it with `DOCKER.ps1 -Start`, then retry |
| Backend log: `password authentication failed` | A place in §1 still has the old password | Re-run §6 or §7 for that host |
| `DATABASE_URL` fails while `POSTGRES_PASSWORD` works | The password has URL-special characters (`!`, `@`, `#`, `%`, `/`, …) and is unencoded in the URL | The §6 script encodes it. By hand, `!` becomes `%21`, and so on |

---

## 10. Status of the 2026-10-07 rotation

| Place | Status |
|---|---|
| PostgreSQL role `sms_user` | ✅ changed (SCRAM-SHA-256); old password rejected |
| QNAP `.env.qnap.postgres-only` | ✅ updated |
| REC `config\.env` (Docker) | ✅ updated; login verified |
| REC `src\backend\.env` (Native) | ✅ updated; login verified |
| Repo docs and scripts | ✅ old password removed from 6 docs and 1 script fallback |
| Laptop `C:\Program Files\SMS\config\.env` | ⏳ still has the old password (§6) |
| SMS Lite installs | ⏳ still have the old password (§7) |

Related: [QNAP_POSTGRES_SINGLE_SOURCE.md](QNAP_POSTGRES_SINGLE_SOURCE.md) (storage per
deployment mode), [ANDROID_TAILSCALE_GUIDE.md](ANDROID_TAILSCALE_GUIDE.md) (Android access).
