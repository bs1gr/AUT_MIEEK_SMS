# Privacy and GDPR: what the system does, and what the institution must do

**Applies from**: v1.18.68
**Audience**: the administrator of an installation and the institution's data protection contact

This is a technical description, not legal advice. The institution that runs the system is the
data controller under the GDPR and Cyprus Law 125(I)/2018. The software can limit and protect
data; it cannot decide the legal basis, the retention periods or the agreements with hosting
providers. Those are listed at the end.

## What the system does

### Cookies and storage on the device

| Item | Purpose | Consent needed |
|---|---|---|
| Refresh-token cookie (HttpOnly, SameSite=Lax, Secure when `COOKIE_SECURE=true`) | keeps the user signed in | no, strictly necessary |
| CSRF cookie (when `CSRF_ENABLED`) | protects forms | no, strictly necessary |
| `localStorage`: language, theme, date format, time zone, update flag | interface preferences | no |

There are no analytics or advertising cookies, no tracking and no third-party scripts or fonts;
client errors are reported to the installation's own backend. For that reason no cookie banner is
shown (Law 112(I)/2004, section 14, exempts what is strictly necessary).

### Health information (`students.health_issue`)

Health data is a special category (GDPR Article 9).

- It is **not** part of any general student response (lists, single student, analytics).
- Only an **administrator** reads or writes it: `GET` / `PUT /api/v1/students/{id}/health`.
  A teacher's or office account that sends the field in a student create or update has it ignored;
  the stored value is left as it is.
- The audit log records that health information exists or changed (`[recorded]`), never its text.
- The semester export file (`/sessions/export`) leaves it out unless an administrator adds
  `include_health=true`. Importing a file without it does not wipe what the install already holds.
- The **encrypted semester archive** keeps it: that archive is the complete record of the semester.
- Custom reports already drop sensitive fields for everyone except administrators.

There is no screen that shows health information. An administrator who needs it uses a custom
report or the API endpoint above.

### Staff notes about students

The notes box on the Students page is each account's own notebook. Notes are stored on the server
(`student_private_notes`, one row per student and account); an account can read and write only its
own, and they are removed when the account is deleted or the student is removed for good.

Earlier versions kept these notes in the browser. The first time an account opens the Students
page after the update, notes found in that browser are sent to the server and removed from the
browser. If the account already has a note for that student, the browser text is added below it.
On a shared computer the first account to open the page receives the notes that were in it.

### Privacy notice

`/#/privacy` is reachable without signing in and is linked from the footer of every page (EN/EL).
It states what data is kept, why, who sees it, the cookies above and the data subject's rights,
including the complaint to the Commissioner for Personal Data Protection.

Who the controller is comes from four backend settings; until the first two are set the page says
to ask the school office:

| Setting | Meaning |
|---|---|
| `PRIVACY_CONTROLLER_NAME` | the institution, as it should be named |
| `PRIVACY_CONTACT` | e-mail or phone for privacy questions and requests |
| `PRIVACY_DPO_CONTACT` | the data protection officer, if one is appointed (optional) |
| `PRIVACY_NOTICE_URL` | link to the institution's own full notice (optional, http/https only) |

Set them in the backend `.env` of each installation (for the cloud host:
`infra/docker/cloud/.env`) and restart.

## What the institution must do

The software cannot do these, and none of them is recorded in the project:

1. **Lawful basis.** Decide and document it (for a public educational body normally Article
   6(1)(e) or (c), not consent) and, for health data, the Article 9 condition. If consent is
   relied on for anything, it must be collected and recorded outside the system: the system has
   no consent register.
2. **Health data.** Decide whether it should be recorded at all. If not, clear the column.
3. **Retention.** Set how long student records, audit logs, backups and semester archives are
   kept, and apply it.
4. **Processors.** A written data-processing agreement with every host that sees the data. For
   the Oracle cloud host: confirm that Oracle's agreement covers the Always Free tier, and that
   the institution's policy allows the hosting.
5. **Records and requests.** Keep the record of processing activities, and have a way to answer
   access, correction and deletion requests.
6. **The notice text.** Review the wording of the Privacy page and supply the contact details.
