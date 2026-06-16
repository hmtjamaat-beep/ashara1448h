# Attendance Dashboard (live from Google Sheets)

A single-page dashboard that reads your Google Sheet **every time it loads** and renders charts
and a searchable table. Host it free on GitHub Pages. No backend, no build step.

It only reads **name + sector + incharge + gender + misaq + the day columns**. Personal
identifiers (ITS ID, phone, address, email, blood group) are never requested or stored.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole dashboard. This is the only file you edit. |
| `README.md` | This guide. |

---

## 1. Where to put your Google Sheet URL

Open `index.html` and edit the **CONFIG** block near the top (it's clearly marked).
You only ever touch this block:

```js
const CONFIG = {
  SHEET_ID: "161tCOlKVaV4AHyi6UmsxbWsnvPKBhFyzhPOEUlXktI8",   // from the sheet URL
  GID: "108774125",                                            // the tab's gid
  PUBLISHED_CSV_URL: "",                                       // fallback, see step 4
  DAYS: ["2","3","4","5","6","7","8","9","10"],
  AUTO_REFRESH_MIN: 5
};
```

Your sheet URL looks like:

```
https://docs.google.com/spreadsheets/d/161tCOlKVaV4AHyi6UmsxbWsnvPKBhFyzhPOEUlXktI8/edit#gid=108774125
                                        └──────────── SHEET_ID ───────────────────┘        └── GID ──┘
```

- **SHEET_ID** = the part between `/d/` and `/edit`.
- **GID** = the number after `#gid=` (the specific tab). First tab is usually `0`.

These are already filled in with your current sheet, so you may not need to change anything.

---

## 2. Make the sheet readable

The page reads the sheet through the browser, so the sheet must be link-readable:

1. In Google Sheets: **Share** (top right).
2. Under *General access* choose **Anyone with the link** → role **Viewer**.
3. Done. (No one can edit — only view.)

> If your data is sensitive, see step 4 for the "Publish to web" alternative, which exposes
> only this one tab as CSV rather than the whole file.

---

## 3. Host on GitHub Pages

1. Create a new repository on GitHub (e.g. `attendance-dashboard`), **Public**.
2. Upload `index.html` (and `README.md`) — use **Add file ▸ Upload files**, or:
   ```bash
   git init
   git add index.html README.md
   git commit -m "Attendance dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/attendance-dashboard.git
   git push -u origin main
   ```
3. In the repo go to **Settings ▸ Pages**.
4. Under *Build and deployment ▸ Source* pick **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. Wait ~1 minute. Your dashboard is live at:
   ```
   https://<your-username>.github.io/attendance-dashboard/
   ```

---

## 4. How "auto-update" works

- The page fetches the sheet **fresh on every load** and again every `AUTO_REFRESH_MIN` minutes
  (default 5). A cache-busting parameter is added so you always get the latest data.
- So: **edit your Google Sheet → reload the page (or wait 5 min) → numbers update.**
  You do **not** need to re-deploy to GitHub when the data changes — only when you change the
  dashboard code itself.
- There's also a **↻ Reload** button in the top-right to refresh on demand.

### If the page shows a red "Could not load the sheet" box (CORS)
Some Google accounts block the direct CSV endpoint from a browser. The reliable fix:

1. In Google Sheets: **File ▸ Share ▸ Publish to web**.
2. Choose the specific tab, format **Comma-separated values (.csv)**, click **Publish**.
3. Copy the link it gives you and paste it into `PUBLISHED_CSV_URL` in `index.html`:
   ```js
   PUBLISHED_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=108774125&single=true&output=csv",
   ```
4. Re-upload `index.html`. This URL also auto-reflects sheet edits.

---

## Notes on the numbers

- **People vs. status counts:** Every person is counted once. Anyone with no status entered for the
  selected day appears under **Not recorded**, so the four status counts plus *Not recorded* always
  add up to the total people. (This is why earlier a raw count of statuses looked one short of the
  headcount — one person had no status filled in.)
- **Columns are matched by header name** (`Full_Name`, `Gender`, `Misaq`, `Sector`,
  `Sector_Incharge_Name`, and the day headers `2`–`10`), so inserting/moving columns won't break it,
  as long as those header names stay the same.
- **Status values** recognised: `ontime`, `late`, `absent`, `other mauze` (case-insensitive).
  If you use different words in the sheet, update the `STAT`/`SLABEL`/`COL` lists in `index.html`.
