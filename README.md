# Knights of the Holy Temple – Brotherhood Portal

Static site (GitHub Pages) + Firebase (Google sign-in + Firestore). No server to run.

## 1. Create the Firebase project (free)
1. Go to https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Build → Firestore Database → Create database** (production mode).
4. **Firestore → Rules** tab: paste the contents of `firestore.rules` → **Publish**.
5. **Project settings (gear) → Your apps → Web (</>)** → register an app → copy the config values into `firebase-config.js`.

## 2. Put it on GitHub Pages
1. Create a new GitHub repo and upload everything in this folder (keep the files at the repo root).
2. Repo **Settings → Pages → Deploy from a branch → main / (root)**.
3. Your site will be at `https://YOUR-USERNAME.github.io/REPO-NAME/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains → Add** `YOUR-USERNAME.github.io`.

## 3. Create the first admin
Sign-in only works for people on the roster. Add yourself by hand once:
1. Firestore → **Start collection** → ID `roster`.
2. Document ID: your Google email in **lowercase** (e.g. `you@gmail.com`).
3. Fields (all strings): `name` = Your Name, `role` = `admin`, `status` = `active`, `committee` = (blank), `gradYear` = (blank).
4. Open the site and sign in with that Google account.

After that, admins add members in **Member Directory → Add member**, or approve people who tap **Request access** after signing in.

## Roles
- **member** – read everything, chat, log hours, check in, vote, submit prayer requests, update their own task status.
- **officer** – also post announcements, events, committees, tasks, polls, recognition; approve hours; see poll tallies.
- **admin** – also manage the roster and access requests.

All permissions are enforced by `firestore.rules` on the server, not just hidden in the page.

## Logo
Drop your logo in the repo root as `logo.png` (it shows on the sign-in card). A ✠ cross is used until then.

## Notes
- Polls: one vote per member, final. Officers can see who voted for what.
- "Anonymous" prayer requests hide the name in the app; an admin could still see the sender's email in the Firebase console.
- File attachments (the old Drive upload / chat paperclip) are not included; Firebase Storage needs a paid plan. Link to Drive files in messages instead.
- Chat shows the latest 150 messages.
