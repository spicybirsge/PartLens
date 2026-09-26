# Privacy Policy — PartLens

**Effective date:** September 26, 2026
**Operator:** Shaheer Ahamed (`shaheer.myhome@gmail.com`)
**Contact for privacy, access, and deletion requests:** `shaheer.myhome@gmail.com`

This policy explains what data the hosted PartLens service collects, why, and
what choices you have. It applies **only to the instance operated by Shaheer
Ahamed**. PartLens is open-source (GPLv3) and anyone may self-host it;
self-hosted instances have their own operators and their own privacy
practices, which are not covered here.

## 1. Summary

- We collect the minimum needed to run the service: Google account
  identifiers, your projects/manuals/uploads, session records, and
  per-project view records keyed by IP address.
- Public projects (and your public profile) are visible to everyone.
  Unlisted projects are hidden from listings but viewable by URL.
- We share data only with the providers that operate the service
  (Google sign-in, ImageKit file storage, database/hosting infrastructure).
  We do not sell personal data or use it for advertising.
- Contact us at the email above for access, correction, or deletion requests.

## 2. Data we collect

### 2.1. Account data (via Google OAuth)

When you sign in with Google, we receive and store:
- Google account ID, email address, email-verification status, display name,
  and profile picture URL;
- a PartLens username (auto-generated; you may change it, 1–30 characters).

### 2.2. Content you provide

- Projects: name, description, `.glb` file URL, visibility setting
  (`unlisted`), and public identifier;
- Parts: part number, name, description;
- Manuals: title and `.pdf` file URL;
- Profile edits (username, display name, avatar image URL) and bookmarks
  of projects and parts.

### 2.3. Session and device data

For authentication and security we store server-side sessions, including a
SHA-256 hash of your session token (never the token itself in the database),
expiry (30 days), and the IP address, user-agent string, and last-activity
timestamp recorded at sign-in and refreshed during use. Your browser holds
the bearer session token; clearing site data signs you out on that device
(the server-side session remains until expiry unless you log out).

### 2.4. Usage and view data

- Viewing a project records the project ID, your IP address, and the view
  timestamp (one row per unique IP per project; repeat views refresh the
  timestamp). Owners see aggregate counts (total/today/this-week/this-month).
- Like most services, our server logs (request logs) and rate-limiting
  counters necessarily process IP addresses and request metadata for
  security and stability.

### 2.5. What we do not collect

We do not collect payment details (the hosted service is currently free), do
not run advertising or cross-site trackers, and do not perform PDF full-text
extraction or profiling. Search queries are processed to return results and
are not stored as a separate history.

## 3. How we use data

We use the data above to:
- (a) provide, maintain, and secure the service (accounts, sessions,
  uploads, rate limiting, abuse prevention);
- (b) display your public projects, profile, and manuals as you configure them;
- (c) show owners analytics about their own projects;
- (d) communicate about security, abuse, or legal matters;
- (e) comply with applicable law.

We do not use your data for advertising.

## 4. Public vs. unlisted — please read

- **Public** projects, their parts/manuals, view counts, and your public
  profile (username, name, avatar, public project list) are visible to
  **anyone on the internet**, including anonymous visitors and search engines.
- **Unlisted** projects are excluded from search, discovery, and public
  profiles, but **anyone who has the URL can view them**. They are not
  encrypted or access-controlled.
- Only upload Content you are comfortable sharing under these visibility rules.

## 5. Sharing and third parties

We share data only as needed to operate the service:

| Provider | Purpose | Data involved |
|---|---|---|
| Google | OAuth sign-in | OAuth code/token exchange; profile data listed in §2.1 |
| ImageKit | File storage | Uploaded `.glb`, `.pdf`, and image files and their URLs |
| Database / Redis / server hosting providers | Infrastructure | All stored data; provider location may change as the deployment evolves |

These providers process data under their own policies and security measures.
We do not sell personal data and do not share it with advertisers or data
brokers. We may disclose data if required by applicable law or to protect the
rights, safety, or integrity of the service, its users, or the public.

Because the deployment may move between regions and providers, data may be
transferred and stored in different jurisdictions. By using the service, you
consent to such transfers as necessary to operate it.

## 6. Retention and deletion

- **Sessions** expire after 30 days; logging out deletes the current session
  immediately ("log out everywhere" ends all other sessions).
- **Projects, parts, manuals, and bookmarks** persist until you delete them
  in the dashboard. Deleting a project removes its database records,
  including associated parts, manuals, view records, and bookmarks.
- **View records** for a project are removed when the project is deleted.
- **Backups and logs** age out on their own schedules; residual copies may
  persist for a limited time.
- **Account deletion** is self-serve: open Settings, use the options menu
  (three dots) on your Profile card, choose "Delete account", and confirm by
  typing your username in capital letters. This permanently deletes your
  account record (which cascades to your projects and sessions). Note that
  copies of previously public Content may survive outside our systems
  (caches, downloads). If you cannot access your account, email us from your
  account address and we will help.

## 7. Security

We apply reasonable safeguards: session tokens are random opaque values
stored server-side as SHA-256 hashes, passwords are never handled by us
(authentication is delegated to Google), uploads are type- and size-checked,
and mutations require ownership. No system is perfectly secure, so we cannot
guarantee absolute security — use a strong, unique Google account and keep
your devices secure.

## 8. Your rights

Subject to applicable law, you may request access to, correction of, or
deletion of your personal data, and may manage much of it directly (profile
settings; project/part/manual and bookmark management in the dashboard). Send
requests to `shaheer.myhome@gmail.com` from your account email; we will
respond within a reasonable time and may need to verify your identity.

## 9. Children

The service is not directed at children under 13, and accounts require users
to be at least 13 (with parental consent where required locally). If you
believe a child under 13 has created an account on our hosted instance,
contact us and we will take appropriate action.

## 10. Changes to this policy

We may update this policy as the service evolves (for example, if hosting,
providers, or features change). Material changes will be announced with an
updated effective date; continued use after the changes take effect means you
accept the revised policy.

## 11. Contact

Privacy questions or requests: `shaheer.myhome@gmail.com` (operator:
Shaheer Ahamed, Sri Lanka).
