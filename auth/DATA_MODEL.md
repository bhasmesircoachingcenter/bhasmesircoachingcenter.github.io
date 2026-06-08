# Student Portal — Firestore Data Model

This document describes the Firestore collections used by the student portal and
how the **admin (owner)** populates data manually from the Firebase console for
the MVP. No backend/Cloud Functions are required.

> Security note: the Firebase Web `apiKey` in `auth/firebase-config.js` is a
> **public client identifier** (safe to commit). All access control is enforced
> by Firebase Authentication + the rules in `firestore.rules`. Never put private
> keys or service-account JSON in the website.

---

## Collections & fields

### `students/{uid}`
The student's profile. `{uid}` is the Firebase Auth user id (created
automatically on register / first Google sign-in).

| Field       | Type      | Notes                                        |
|-------------|-----------|----------------------------------------------|
| `name`      | string    | Full name (from register / Google `displayName`) |
| `email`     | string    | Login email — written on register & first Google sign-in. Used by the admin **broadcast** feature to collect recipients (the client cannot read Firebase Auth emails directly). |
| `phone`     | string    | Optional; admin can fill in                  |
| `batch`     | string    | e.g. `"Class 10 - Algebra"`                  |
| `schedule`  | string    | Optional, e.g. `"Mon/Wed/Fri 6:00–7:30 PM"`  |
| `createdAt` | timestamp | Set automatically on register                |

> **Note:** `email` and `name` are written into `students/{uid}` at registration
> (`createUserWithEmailAndPassword` flow in `auth/auth.js`) and on first Google
> sign-in. Older accounts created before these fields were stored may be missing
> `email`; the broadcast feature simply skips students with no email on file.

**Example**
```json
{
  "name": "Aarav Patil",
  "email": "aarav@example.com",
  "phone": "+91 90000 00000",
  "batch": "Class 10 - Algebra",
  "schedule": "Mon/Wed/Fri 6:00–7:30 PM",
  "createdAt": "<server timestamp>"
}
```

### `students/{uid}/attendance/{autoId}`
One document per attendance entry. `autoId` = auto-generated id.

| Field    | Type   | Notes                          |
|----------|--------|--------------------------------|
| `date`   | string or timestamp | e.g. `"2026-07-05"` |
| `status` | string | `"present"` or `"absent"`      |
| `note`   | string | Optional remark                |

**Example**
```json
{ "date": "2026-07-05", "status": "present", "note": "" }
```

### `students/{uid}/results/{autoId}`
One document per test result.

| Field      | Type   | Notes                     |
|------------|--------|---------------------------|
| `testName` | string | e.g. `"Unit Test 1"`      |
| `subject`  | string | e.g. `"Algebra"`          |
| `marks`    | number | Marks scored              |
| `outOf`    | number | Maximum marks             |
| `date`     | string or timestamp | Test date    |

**Example**
```json
{ "testName": "Unit Test 1", "subject": "Algebra", "marks": 38, "outOf": 40, "date": "2026-07-10" }
```

### `announcements/{autoId}`
Readable by any signed-in student. The portal shows announcements whose
`audience` is `"all"` or matches the student's `batch`.

| Field      | Type   | Notes                                  |
|------------|--------|----------------------------------------|
| `title`    | string | Headline                               |
| `body`     | string | Message                                |
| `date`     | string or timestamp | Publish date              |
| `audience` | string | `"all"` or a batch name e.g. `"Class 10 - Algebra"` |

**Example**
```json
{
  "title": "Diwali break",
  "body": "Classes paused 1–5 Nov. Resume 6 Nov.",
  "date": "2026-10-25",
  "audience": "all"
}
```

### `admins/{uid}`
**Document existence = admin.** The document body can be empty `{}`. Any uid that
has a doc here is treated as an admin by `firestore.rules` (can write
attendance/results/announcements and any student profile).

**Example**: a document at `admins/AbCd1234...` with no fields.

---

## How the admin enters data (Firebase console)

1. Go to **Firebase console → Firestore Database**.
2. **Make yourself admin (one time):**
   - First, register/login once on the live site so your account exists.
   - Find your **uid**: Firebase console → **Authentication → Users** → copy the
     User UID for your account.
   - In Firestore, create collection `admins` → add a document with **Document ID
     = your uid** → leave fields empty → Save.
3. **Set a student's batch/schedule:** open `students/{uid}` (the doc is created
   on the student's first login) and edit `batch` / `schedule` / `phone`.
4. **Add attendance:** open `students/{uid}` → start subcollection `attendance`
   → Add document (auto-id) with `date`, `status`, `note`.
5. **Add results:** open `students/{uid}` → subcollection `results` → Add
   document with `testName`, `subject`, `marks`, `outOf`, `date`.
6. **Add announcements:** top-level `announcements` collection → Add document
   with `title`, `body`, `date`, `audience` (`"all"` or a batch name).

> Ordering: attendance and results are sorted by `date` descending in the portal.
> Using ISO date strings like `"2026-07-05"` sorts correctly; timestamps also work.

---

## Admin broadcast email ("Email Students")

The admin panel (`admin.html` → **Email Students** tab) lets an admin send one
email to a chosen audience. There is **no** Cloud Function: sending is delegated
to the existing **Google Apps Script web app** (the same `/exec` endpoint used
for enquiry capture in `script.js`).

**Audience selector** — the admin picks who receives the email:

| `audience` value | Recipients | Source |
|------------------|------------|--------|
| `registered` | Registered portal students with an `email` on file | Firestore `students` collection (collected client-side) |
| `sheet`      | Enquiry / contact-form leads | The enquiry Google Sheet's **Email** column (read **server-side** by the Apps Script) |
| `both`       | Registered students **+** enquiry contacts, merged & de-duplicated | Both of the above |

**Flow**

1. The admin opens the Broadcast tab and chooses an audience; a live summary
   updates (registered count, or "all enquiry contacts in the Google Sheet").
2. For `registered`/`both`, `admin.js` reads the whole `students` collection
   client-side and collects every non-empty, valid, de-duplicated `email`.
   For `sheet`, no client list is needed — the server reads the sheet itself.
3. The admin enters a **subject** + **message** and confirms.
4. `admin.js` obtains the admin's Firebase **ID token**
   (`await auth.currentUser.getIdToken()`) and POSTs a form-urlencoded request
   to the Apps Script `/exec` URL with `mode: 'no-cors'`, `keepalive: true`.
5. The Apps Script (owner-maintained, **server-side**) verifies the ID token
   belongs to an authorized admin email, then builds the recipient set from
   `recipients` (registered/both) and/or the sheet's Email column (sheet/both),
   de-dupes, and BCC-emails them in batches.
6. Because the `no-cors` response is opaque/unreadable, the client shows an
   **optimistic** success message.

**POST parameters** (`application/x-www-form-urlencoded`):

| Param        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| `action`     | `broadcast`                                                           |
| `idToken`    | Firebase ID token of the signed-in admin (server verifies)            |
| `audience`   | `registered` \| `sheet` \| `both`                                     |
| `subject`    | Email subject                                                         |
| `body`       | Email message body                                                   |
| `recipients` | Comma-joined registered-student emails (used for `registered`/`both`) |
| `lang`       | Current UI language (`en` / `mr`)                                    |

> Security: authorization is enforced entirely by the server verifying the
> Firebase `idToken` (admin email allow-list). **No static secret/token is
> embedded in the client** — this complies with the no-hardcoded-credentials
> rule. The `/exec` URL itself is a public, non-secret endpoint.
