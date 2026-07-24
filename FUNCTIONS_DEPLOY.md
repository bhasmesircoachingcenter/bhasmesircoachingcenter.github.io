# Portal accounts (admin-created student logins)

Students log in with a **username** (first initial of first name + surname, lowercase) and **password = 10-digit mobile number**. Email is **optional** (contact only — welcome/receipt emails sent only when an email is on file).

Examples: `Jayant Roashanji Sahare` → `jsahare` · `Dhiraj Bhasme` → `dbhasme`

Firebase Auth uses a synthetic email: `{username}@portal.bhasmesircoaching.in`

**Legacy:** older accounts using `{mobile}@portal.bhasmesircoaching.in` can still log in with the 10-digit mobile as username until recreated.

## Default path (free — no Blaze plan)

Portal account create/delete uses **Google Apps Script** + client-side Firestore — the same pattern as attendance. No Firebase Cloud Functions or Blaze billing required.

### After updating `admission/Code.gs`

1. Open your coaching spreadsheet → **Extensions → Apps Script**
2. Replace all code with `admission/Code.gs` from this repo → **Save**
3. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**

If **Portal Accounts** shows an Apps Script error, redeploy with a new version (step 3).

### Admin usage

1. Open **Admin → Portal Accounts**
2. Students from the **Admissions** sheet without an account show **Create account** (mobile required for password; username derived from name)
3. Registered students show **Remove account**

**Create:** Admin browser creates the Firebase Auth user (synthetic `{username}@portal.bhasmesircoaching.in`) and Firestore profile with `username` field. Optional welcome email sent only if a contact email exists.

**Remove:** Admin browser deletes the Auth user (tries username email, then legacy mobile email); Firestore profile + attendance/results subcollections are removed.

## Student login

- **Username:** first initial + surname (e.g. `jsahare`), or legacy 10-digit mobile (e.g. `7058505983`)
- **Password:** 10-digit mobile (no +91)
- **Admins:** Google sign-in or full email + password

Self-registration on the login page is disabled; accounts are created by admin only.

## Troubleshooting

- Apps Script outdated / `unknown subaction` — paste latest `Code.gs`, deploy **New version**
- `unauthorized` — sign in as `bhasmesircoachingcenter@gmail.com` in the admin panel
- `already-exists` — student already has a portal account for that username
- `invalid-phone` — mobile must be a valid 10-digit Indian number
- `invalid-username` — full name on Admissions sheet could not produce a username
- Welcome email skipped — normal when no optional email on file; use WhatsApp to share login details
- Existing old accounts — remove and recreate for username login, or student can try legacy mobile login

---

## Optional: Cloud Functions (Blaze plan)

Cloud Functions are **not required** for portal accounts. Use this only if you prefer server-side Firestore writes via Admin SDK.

### One-time setup

1. Install [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
2. Log in: `firebase login`
3. Upgrade project to **Blaze** (pay-as-you-go) in Firebase console
4. From the **`Bhasme Coaching`** folder (parent of `website/` and `functions/`):

```bash
cd "/path/to/Bhasme Coaching"
firebase use bhasme-sir-coaching-center
cd functions && npm install && cd ..
firebase deploy --only functions
```

5. After deploy, note the region: **asia-south1** (Mumbai).

### What gets deployed

| Function | Purpose |
|----------|---------|
| `createStudentAccount` | Admin creates Auth user + `students/{uid}` from admission data |
| `deleteStudentAccount` | Admin removes portal account (Auth + Firestore) |

To use Cloud Functions instead of Apps Script, you would need to revert `admin.js` to `httpsCallable` — the current website uses Apps Script by default.

### Cloud Functions troubleshooting

- `functions/not-found` — run `firebase deploy --only functions`
- `permission-denied` — ensure `admins/{your-uid}` exists in Firestore
- `invalid-username` — check full name on Admissions sheet
