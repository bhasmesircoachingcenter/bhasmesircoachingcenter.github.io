# Deploy Cloud Functions (admin-created student accounts)

Students log in with **email** (from the Admissions sheet) and **password = 10-digit mobile number**.

## One-time setup

1. Install [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
2. Log in: `firebase login`
3. From the **`Bhasme Coaching`** folder (parent of `website/` and `functions/`):

```bash
cd "/path/to/Bhasme Coaching"
firebase use bhasme-sir-coaching-center
cd functions && npm install && cd ..
firebase deploy --only functions
```

4. After deploy, note the region: **asia-south1** (Mumbai).

## What gets deployed

| Function | Purpose |
|----------|---------|
| `createStudentAccount` | Admin creates Auth user + `students/{uid}` from admission data |
| `deleteStudentAccount` | Admin removes portal account (Auth + Firestore) |

## Admin usage

1. Open **Admin → Portal Accounts**
2. Students from the **Admissions** sheet without an account show **Create account**
3. Registered students show **Remove account**

## Student login

- **Username:** email from admission form  
- **Password:** 10-digit mobile (no +91), e.g. `7058505983`

Self-registration on the login page is disabled; accounts are created by admin only.

## Troubleshooting

- `functions/not-found` — run `firebase deploy --only functions`
- `permission-denied` — ensure `admins/{your-uid}` exists in Firestore
- `already-exists` — student already has an account with that email
