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

Health data is a special category (GDPR Article 9), and some hosting terms forbid it: Oracle's
Data Processing Agreement (version 14 August 2025, section 2.6) says the customer may not provide
data that imposes specific data-protection obligations, and names regulated health information.

**It is not recorded by default.** With `HEALTH_DATA_ENABLED` unset or false the application
neither stores, imports, shows nor exports health information: the student routes and every
importer drop the field, the model refuses to write it whatever code path tries, the health
endpoint returns nothing and refuses writes (409), and the administrator section of the Edit
dialog has no health field. Text an installation already holds is left alone until it is
cleared; on the ΜΙΕΕΚ database it was cleared on 2026-11-13 (4 students, and the copies in 6
audit rows) on the owner's decision.

Set `HEALTH_DATA_ENABLED=true` only where the institution has a legal ground and the host
allows it. Never on the Oracle cloud host. With it on:

- It is **not** part of any general student response (lists, single student, analytics).
- Only an **administrator** reads or writes it: `GET` / `PUT /api/v1/students/{id}/health`.
  A teacher's or office account that sends the field in a student create or update has it ignored;
  the stored value is left as it is.
- The audit log records that health information exists or changed (`[recorded]`), never its text.
- The semester export file (`/sessions/export`) leaves it out unless an administrator adds
  `include_health=true`. Importing a file without it does not wipe what the install already holds.
- The **encrypted semester archive** keeps it: that archive is the complete record of the semester.
- Custom reports already drop sensitive fields for everyone except administrators.

An administrator sees and edits it in the student's **Edit** dialog, in the section "Personal data
(administrators only)". No other screen or list shows it.

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

### Requests from a student (access and erasure)

In the student's **Edit** dialog an administrator has, under "Personal data (administrators
only)":

- **Download all data about this student**: one JSON file with every record the database holds
  about them, including records that were hidden by a normal delete
  (`GET /api/v1/data-subject/students/{id}/export`). Staff members' private working notes are
  not part of it.
- **Erase permanently**: removes the student and every grade, attendance record, enrolment,
  performance record, highlight and staff note about them, and blanks the personal details in
  the audit entries of that student (`DELETE /api/v1/data-subject/students/{id}?confirm=<registry
  number>`). The registry number must be typed to confirm. This is different from **Delete**,
  which only hides the student and can be undone by re-importing.

Erasure does not reach database backups, semester archives or files exported earlier; those
follow the retention rules below. Whether a request must be granted is the institution's
decision: it may be obliged to keep the academic record.

## Recommended defaults (to be confirmed by the institution)

These are the defaults the system and this document assume until the institution decides
otherwise. They are proposals, not legal advice, and none of them is enforced automatically.

| Topic | Recommended default |
|---|---|
| Lawful basis, student records (identity, enrolments, grades, attendance) | Article 6(1)(e), task in the public interest, with 6(1)(c) where the law requires the record. Not consent. |
| Lawful basis, staff accounts and audit log | Article 6(1)(e) and the security duty of Article 32. |
| Health information | Not recorded (`HEALTH_DATA_ENABLED` off, the default). If the office needs it for a student's safety, it keeps it on paper. Switching recording on needs an Article 9 condition (9(2)(g) where a law provides for it, otherwise explicit written consent, 9(2)(a)) and a host whose terms allow it. |
| Consent register | Not needed: nothing in the system relies on consent. If the office collects consent for health information or anything else, it keeps the signed form itself. |
| Retention, student academic record | The period the institution's archive rules set for academic records. Until that is written down, nothing is deleted automatically. |
| Retention, staff private notes | Deleted by their author when no longer needed, and removed with the account. Proposed: clear at the end of each academic year. |
| Retention, audit log | Proposed: two years. |
| Retention, backups and semester archives | Proposed: backups one year, semester archives as long as the academic record. |
| Semester export files | Without health information (the default). Delete the file once it has been imported elsewhere. |
| Hosting | Inside the EU, with a written data-processing agreement (see below). |
| Privacy notice | The built-in page, with the four `PRIVACY_*` settings filled in. |

## What the institution must do

The software cannot do these. The table above gives the default this document assumes for each;
the decision itself is the institution's and is not recorded anywhere in the project:

1. **Lawful basis.** Decide and document it (for a public educational body normally Article
   6(1)(e) or (c), not consent) and, for health data, the Article 9 condition. If consent is
   relied on for anything, it must be collected and recorded outside the system: the system has
   no consent register.
2. **Health data.** Decide whether it should be recorded at all. If not, clear the column.
3. **Retention.** Set how long student records, audit logs, backups and semester archives are
   kept, and apply it.
4. **Processors.** A written data-processing agreement with every host that sees the data. For
   the Oracle cloud host: Oracle's Data Processing Agreement for Oracle Services (version 14
   August 2025, read 2026-11-13) applies automatically to the services in the customer's
   Services Agreement, with Oracle as processor, storage in the chosen region (Frankfurt) and
   breach notice within 24 hours; it has no exclusion for trials. The Oracle Cloud Services
   Agreement for Cyprus (online version of 22 June 2023, with Oracle's Cyprus branch, governed by
   Cyprus law; read 2026-11-13) incorporates that agreement by reference wherever the content
   includes personal data (section 5.2) and has no exclusion for free or trial accounts either;
   section 5.4 repeats that the content may not include regulated health data. Both documents
   refer to "Your order": the order record of the free account is not visible in the Oracle
   console and was not read, so a written confirmation from Oracle (one question in the console
   chat) is the only thing that would add certainty. A free account has no uptime promise and
   Oracle's liability is capped at the fees paid, which is nothing; the home installation stays
   as the backup. Confirm that the institution's policy allows the hosting.
5. **Records and requests.** Keep the record of processing activities, and have a way to answer
   access, correction and deletion requests.
6. **The notice text.** Review the wording of the Privacy page and supply the contact details.
