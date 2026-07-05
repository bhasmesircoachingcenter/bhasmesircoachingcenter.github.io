# Portal accounts (admin-created student logins)

Students log in with **email** (from the Admissions sheet) and **password = 10-digit mobile number**.

## Default path (free — no Blaze plan)

Portal account create/delete uses **Google Apps Script** + client-side Firestore — the same pattern as attendance. No Firebase Cloud Functions or Blaze billing required.

### After updating `admission/Code.gs`

1. Open your coaching spreadsheet → **Extensions → Apps Script**
2. Replace all code with `admission/Code.gs` from this repo → **Save**
3. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**

If **Portal Accounts** shows an Apps Script error, redeploy with a new version (step 3).

### Admin usage

1. Open **Admin → Portal Accounts**
2. Students from the **Admissions** sheet without an account show **Create account**
3. Registered students show **Remove account**

**Create:** Apps Script calls Firebase Auth REST API (`signUp`); admin browser writes `students/{uid}` in Firestore.

**Remove:** Apps Script signs in as the student and deletes the Auth user; admin browser deletes Firestore profile + attendance/results subcollections.

## Student login

- **Username:** email from admission form  
- **Password:** 10-digit mobile (no +91), e.g. `7058505983`

Self-registration on the login page is disabled; accounts are created by admin only.

## Troubleshooting

- Apps Script outdated / `unknown subaction` — paste latest `Code.gs`, deploy **New version**
- `unauthorized` — sign in as `bhasmesircoachingcenter@gmail.com` in the admin panel
- `already-exists` — student already has an account with that email
- `invalid-phone` — mobile must be a valid 10-digit Indian number (password)

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
