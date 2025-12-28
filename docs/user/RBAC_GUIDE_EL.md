# Οδηγός RBAC (Ρόλοι & Δικαιώματα)

Τελευταία ενημέρωση: 2025-12-28
Έκδοση: 1.12.8

Ο οδηγός αυτός εξηγεί πώς λειτουργούν οι ρόλοι και τα λεπτομερή δικαιώματα στο Σύστημα Διαχείρισης Φοιτητών, πώς αρχικοποιούνται τα προεπιλεγμένα δικαιώματα, και πώς γίνεται η διαχείριση μέσω του admin API.

## Επισκόπηση

- Ρόλοι: `admin`, `teacher`, `guest` (και προσαρμοσμένοι ρόλοι που δημιουργείτε)
- Δικαιώματα: ιεραρχικά ονόματα όπως `students.read`, `courses.write`, `attendance.write`, καθώς και το σύμβολο `*` για πλήρη πρόσβαση
- Αποθήκευση: Πίνακες SQL `roles`, `permissions`, `role_permissions`, `user_roles` (σχήμα μέσω Alembic migrations)
- Επιβολή: FastAPI dependencies `require_permission`, `optional_require_permission`, `optional_require_role`
- Λειτουργία πιστοποίησης (AUTH_MODE):
  - `disabled`: Χωρίς έλεγχο ταυτότητας (τα endpoints εκτός `/auth` επιστρέφουν dummy admin)
  - `permissive`: Ενεργή πιστοποίηση αλλά με ευελιξία· τα admin endpoints απαιτούν έγκυρα διαπιστευτήρια
  - `strict`: Πλήρης έλεγχος παντού

## Προεπιλογές

Χρησιμοποιήστε το endpoint `POST /api/v1/admin/rbac/ensure-defaults` για αρχικοποίηση:

- Δημιουργούνται ρόλοι: `admin`, `teacher`, `guest`
- Δημιουργούνται δικαιώματα:
  - `*` (wildcard, μόνο για admin)
  - `students.read|write|delete`
  - `courses.read|write|delete`
  - `attendance.read|write`
  - `grades.read|write`
  - `imports.preview|execute`
  - `exports.generate|download`
  - `students.self.read`, `grades.self.read`, `attendance.self.read`
- Αντιστοιχίσεις (grants):
  - `admin` → `*`
  - `teacher` → ακαδημαϊκές ενέργειες δημιουργίας/ανάγνωσης/ενημέρωσης + imports/exports (όχι delete)
  - `guest` → μόνο ανάγνωση για φοιτητές/μαθήματα
- Backfill: Αν υπάρχει παλαιό `User.role` (`admin`, `teacher`, `guest`), προστίθεται το αντίστοιχο `UserRole`.

## Admin API (RBAC)

Βασικό prefix: `/api/v1/admin/rbac`

- `POST /roles` → δημιουργία ρόλου
- `GET /roles` → λίστα ρόλων
- `PUT /roles/{role_id}` → ενημέρωση ρόλου
- `DELETE /roles/{role_id}` → διαγραφή ρόλου

- `POST /permissions` → δημιουργία δικαιώματος
- `GET /permissions` → λίστα δικαιωμάτων
- `PUT /permissions/{permission_id}` → ενημέρωση δικαιώματος
- `DELETE /permissions/{permission_id}` → διαγραφή δικαιώματος

- `POST /bulk-assign-role` → εκχώρηση ρόλου σε πολλούς χρήστες
- `POST /bulk-grant-permission` → εκχώρηση δικαιώματος σε πολλούς ρόλους
- `POST /assign-role` → εκχώρηση ρόλου σε έναν χρήστη (προστασία: δεν αφαιρείται ο τελευταίος admin)
- `POST /revoke-role` → αφαίρεση ρόλου από χρήστη (προστασία: δεν αφαιρείται ο τελευταίος admin)
- `POST /revoke-permission` → αφαίρεση δικαιώματος από ρόλο (προστασία: δεν αφαιρείται το `*` από τον admin)
- `GET /summary` → σύνοψη RBAC (ρόλοι, δικαιώματα, αντιστοιχίσεις)
- `GET /change-history` → ιστορικό αλλαγών RBAC με σελιδοποίηση

Όλα τα admin RBAC endpoints απαιτούν κατάλληλα δικαιώματα. Παραδείγματα:
- CRUD για ρόλους/δικαιώματα: `rbac.roles.*` ή `rbac.permissions.*`
- Μαζικές/εκχωρήσεις/ανακλήσεις: `*` (admin) ή λεπτομερή δικαιώματα

## Helpers Δικαιωμάτων

- `require_permission("perm")` → αυστηρή απαίτηση· επιστρέφει 403 αν λείπει
- `optional_require_permission("perm")` → σέβεται `AUTH_ENABLED`/`AUTH_MODE`; σε `disabled` επιστρέφει dummy admin σε μη-auth endpoints
- `optional_require_role("admin")` → έλεγχος ρόλου που τιμά το `AUTH_MODE`; σε `disabled` μπλοκάρει `/admin/*` χωρίς πιστοποίηση

Αποφάσεις δικαιωμάτων:
- Αν υπάρχουν πίνακες RBAC και ο χρήστης έχει `UserRole`, τα δικαιώματα διαβάζονται από `RolePermission`/`Permission`.
- Αλλιώς, χρησιμοποιείται fallback χαρτογράφηση βάση του `User.role`.
- Wildcard (`*`) δίνει πλήρη πρόσβαση· τα ιεραρχικά patterns (π.χ. `students.*`) καλύπτουν υποενέργειες.

## Μεταναστεύσεις & Σχήμα

Το Alembic διαχειρίζεται το σχήμα:
- Τα αρχεία στο `backend/migrations/versions/` περιλαμβάνουν `add_rbac_tables` και σχετικές συγχωνεύσεις.
- Εφαρμογή migrations μέσω ενοποιημένων scripts ή του programmatic runner (`backend/run_migrations.py`).
- Ποτέ μην καλείτε `Base.metadata.create_all()` σε παραγωγή· τα tests χρησιμοποιούν in‑memory DB.

## Ασφάλεια

- Δεν επιτρέπεται η αφαίρεση του ρόλου `admin` όταν θα μείνει χωρίς admin ("τελευταίος admin").
- Δεν επιτρέπεται η αφαίρεση του wildcard `*` από τον ρόλο `admin`.
- Τα admin endpoints χρησιμοποιούν `optional_require_role("admin")` ή `require_permission("*")`.
- Όλες οι αλλαγές RBAC καταγράφονται στο audit (ενέργεια, πόρος, χρήστης, IP, user-agent, επιτυχία/σφάλμα).

## Παραδείγματα (API)

Υποθέστε `Authorization: Bearer <admin-token>` για admin κλήσεις.

Δημιουργία ρόλου:
- `POST /api/v1/admin/rbac/roles` JSON: `{ "name": "auditor", "description": "Read-only reports" }`

Δημιουργία δικαιώματος:
- `POST /api/v1/admin/rbac/permissions` JSON: `{ "name": "reports.read", "description": "Read reports" }`

Μαζική εκχώρηση δικαιώματος:
- `POST /api/v1/admin/rbac/bulk-grant-permission` JSON: `{ "role_names": ["auditor"], "permission_name": "reports.read" }`

Εκχώρηση ρόλου σε χρήστη:
- `POST /api/v1/admin/rbac/assign-role` JSON: `{ "user_id": 42, "role_name": "teacher" }`

Αφαίρεση ρόλου:
- `POST /api/v1/admin/rbac/revoke-role` JSON: `{ "user_id": 42, "role_name": "teacher" }` (μπλοκάρεται αν τελευταίος admin)

Σύνοψη:
- `GET /api/v1/admin/rbac/summary`

## Επιχειρησιακές Συμβουλές

- Ορίστε `AUTH_ENABLED=1` και `AUTH_MODE=permissive` για παραγωγή εκτός αν απαιτείται `strict`.
- Τρέξτε `COMMIT_READY.ps1 -Quick` πριν από commit: format, lint, smoke tests.
- Για migrations σε διαφορετικά περιβάλλοντα (native vs Docker), προτιμήστε τα ενοποιημένα scripts και επαληθεύστε μέσω `/health`.

## Σχετικά Έγγραφα

- `docs/ROLE_PERMISSIONS_MODEL.md` — μοντέλο RBAC
- `backend/security/permissions.py` — helpers και λογική δικαιωμάτων
- `backend/routers/routers_rbac.py` — admin endpoints RBAC
- `backend/run_migrations.py` — programmatic Alembic runner
