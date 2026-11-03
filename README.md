# House Games Championship v3 – React + Supabase
Baptist Academy Jimeta Yola

```
house-games/
├─ supabase/
│  ├─ schema.sql                      ← run once in the Supabase SQL Editor
│  └─ functions/manage-users/index.ts ← deploy once (Edge Function)
├─ src/                               ← the React app
├─ public/logo.png
├─ .env.example                       ← copy to .env and fill in 2 values
└─ package.json
```

---

## What's new in this version (UI redesign)
The logic, database and security rules are unchanged. Only the interface layer was rebuilt:

| Area | Now |
|---|---|
| Layout | Sidebar navigation (slide-in drawer on phones), sticky top bar with year switcher and light/dark toggle |
| Sign-in | Split-screen branded login with show/hide password |
| Dashboard | Hero banner with current leader, KPI cards, podium for the top 3 houses, ranked progress bars, rounded charts |
| Tables | Search box, record counts, avatars, colour chips, role/format badges, icon actions, friendly empty states |
| Dialogs | In-app confirm dialogs (no more browser pop-ups), toasts, loading buttons, Esc to close |
| Fixtures | Bracket match cards with house colours and a clear winner highlight, medal selectors |
| Reports | Card-style download tiles |
| Code | Shared component kit in `src/ui.jsx` (Icon, Btn, Field, Card, Modal, Badge, ...) and one design-token stylesheet `src/styles.css` |

No new npm packages were added.

---

> **Putting this on GitHub?** See `GITHUB-GUIDE.md` – the project includes an automatic GitHub Pages deploy (`.github/workflows/deploy.yml`).

## PART 1 – Install the tools (once per computer)

1. **Node.js** (LTS version 20 or newer): https://nodejs.org → download → install → keep clicking *Next*.
   Check it worked: open a terminal (Windows: *Command Prompt*; Mac: *Terminal*) and type `node -v`.
2. A **Supabase account** (free): https://supabase.com → *Start your project* → sign up.
3. A code editor is optional (VS Code: https://code.visualstudio.com).

## PART 2 – Create the database (Supabase)

1. In Supabase click **New project**. Choose a name (e.g. `house-games`), a strong **database password**
   (save it), a region near you, then **Create new project**. Wait about 2 minutes.
2. Left menu → **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` in any text editor, copy **everything**, paste it into the query box
   and press **Run**. You should see *Success. No rows returned.*
   (This creates all tables, the security rules, the bracket / entry rules and the helper functions.)
4. Left menu → **Authentication → Sign In / Providers** (or *Providers → Email*):
   - Turn **OFF** “Allow new users to sign up” (accounts are created by your admin inside the app).
   - Leave “Confirm email” ON or OFF – both work.
5. Left menu → **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` for now (change it to your real website address later).
   - Add the same address under **Redirect URLs**. (Needed for the “Forgot password?” e-mail link.)
6. Create the **administrator** account: **Authentication → Users → Add user → Create new user**.
   Enter your e-mail and a password, tick **Auto Confirm User**, then **Create user**.
   *The very first account ever created automatically becomes the Admin.*

## PART 3 – Deploy the user-management function

The Users tab (add house masters, principal, …) needs this function because creating login accounts
must be done on a server, never in the browser.

**Easiest way – from the dashboard**
1. Left menu → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly **`manage-users`**.
3. Delete the sample code, paste the whole of `supabase/functions/manage-users/index.ts`, press **Deploy**.

**Or with the command line** (inside the project folder):
```
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase functions deploy manage-users
```
(`YOUR-PROJECT-REF` is the code in your project URL: `https://YOUR-PROJECT-REF.supabase.co`.)

## PART 4 – Connect the website to your database

1. In Supabase: **Project Settings (gear icon) → API** (or *API Keys*). Copy:
   - **Project URL**
   - **anon / public key** (the *anon* key only – never use the `service_role` key in the website)
2. In the project folder, copy `.env.example` to a new file named **`.env`** and fill it in:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-long-key...
   ```

## PART 5 – Run the website

Open a terminal **inside the `house-games` folder** and run:

```
npm install
npm run dev
```

The browser opens at **http://localhost:5173**. Log in with the administrator e-mail and password from
Part 2, step 6.

### First-time use (same flow as before)
1. **Years** → add a year (e.g. 2026/2027).
2. **Users** → add Game Master, House Masters, Principal (use real e-mail addresses). Default password is
   `12345678` unless you type another (min. 6 characters) – ask people to change it on the **Profile** tab.
3. Game Master adds **Games** (choose the format), **Houses** (pick the house master), fixtures and results.
4. House Masters add **Students**, then use **Entries** → tick the students (check boxes) → *Save selected entries*.
5. Principal and Game Master add their signature on the **Signatures** tab (upload a photo or draw it).
6. **Reports & Certificates** → download the report, slides and certificates.

---

## PART 6 – Put it online (so everyone can use it)

1. Build the site: `npm run build` (creates the `dist` folder).
2. Upload it to a free host, for example **Netlify**, **Vercel** or **Cloudflare Pages**:
   - Connect the project (or drag the `dist` folder into Netlify “Deploys”).
   - Add the two environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
     in the host’s settings (if you build on the host), then redeploy.
3. Go back to Supabase **Authentication → URL Configuration** and set **Site URL** (and Redirect URLs) to your
   real address, e.g. `https://house-games.netlify.app`.

> **Password-reset e-mails:** Supabase’s built-in e-mail sender is limited to a few e-mails per hour.
> For a whole school set up your own SMTP in *Project Settings → Authentication → SMTP Settings*
> (Gmail, Brevo, SendGrid, …). Admins can always reset a password directly on the **Users** tab.

---

## What changed compared with the Google Sheets version
| Topic | Before | Now |
|---|---|---|
| Database | Google Sheet | Supabase PostgreSQL |
| Passwords | plain text in the sheet (users could see them) | stored **hashed** by Supabase Auth – nobody can read them |
| Login / reset | custom code | Supabase Auth (reset link by e-mail) |
| Security | checked in Apps Script | **Row Level Security** in the database itself (house masters can only touch their own house, even if someone bypasses the website) |
| Brackets, entry limits, format lock | Apps Script | database functions & triggers (all-or-nothing, so data can’t be left half-saved) |
| Signature size | 48,000 characters | up to 200,000 characters (sharper signatures) |

Everything users see is the same: dashboard, fixtures, checkbox entries, signatures, reports and
a certificate with the name of **every** participating student.

## Moving data from the old Google Sheet
Users must be created again (passwords are not moved). For the rest export each sheet tab to CSV and use
the **Import CSV** button (Games → Houses → Students → Entries; each dialog has a template).
Past results/fixtures are re-entered on the Fixtures page.

## Roles
| Role | Can do |
|---|---|
| Admin | everything, incl. years, all users and signatures of others |
| Game master | games, houses, house masters, fixtures, results, any student, own signature |
| House master | students and entries of **their own house** only |
| Principal | view everything; own signature |
| Board / Student | view only |

## Troubleshooting
| Message / problem | Fix |
|---|---|
| Page says “The app is not connected to Supabase yet” | `.env` is missing or has the placeholder values; fill it in and restart `npm run dev`. |
| “No profile was found for this account” | `schema.sql` was not run before the user was created. Run it, then delete the user in *Authentication → Users* and add it again. |
| Users tab: “Failed to send a request to the Edge Function” | The function is not deployed, or not named exactly `manage-users` (Part 3). |
| “You do not have permission to do this.” | That role may not do it (see Roles). Admin can change a role on the Users tab. |
| House master sees an empty student list | The house must have the house master’s **e-mail** set (Houses → Edit → House master). |
| Reset e-mail not arriving | Check spam; set up SMTP (Part 6); or set a new password on the Users tab. |
| `npm install` fails | Update Node.js to the current LTS version. |

## Security notes
- Only the **anon** key is in the website. The **service-role** key exists only inside Supabase (the Edge Function).
- Keep “Allow new users to sign up” switched off.
- Signatures are visible to every logged-in user (they are printed on certificates).
