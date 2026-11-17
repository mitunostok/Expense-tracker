# Hisab: a simple expense tracker

A small web app for tracking money. It works on your phone, works offline, and needs no account. **All data stays on your device.**

## What it does

- **Wallets:** *Salary* (your bank/salary account) and *Pocket* (cash in hand). You can add more, like Savings or UPI, and set a starting balance for each.
- **Move money:** taking ₹500 out of your salary is a *move* from Salary to Pocket, not spending, so nothing gets counted twice.
- **Expenses:** 16 ready-made categories, plus any custom category (name and emoji) you add while entering an expense.
- **Income:** Salary, Freelance, Business, Bonus and more, plus your own categories.
- **Budgets:** a monthly limit per category. Bars turn yellow at 80% and red when you go over, and alerts show on the home screen.
- **Reports:** spending or income by category, split by wallet, a comparison with last month (which categories went up or down), and a 6‑month income vs spending chart.
- **Savings goals:** for example "New phone: ₹10,000 by March". Add money from a wallet whenever you can, and the app shows how much you need per month to get there.
- **Lent & borrowed:** "Rahul owes you ₹200" or "You owe Amit ₹1,000". Record part payments and set a settle-by date. Pending and overdue ones show on the home screen.
- **Repeating entries:** tick "Repeat every month" (for example on your salary or rent) and it is added automatically every month.
- **History:** browse by month or any date range, filter by type, wallet or category, search notes and names, and see totals for the filtered list.
- **Backup:** save and restore a backup file, or export to CSV for Excel or Google Sheets.
- Light and dark mode, ₹ amounts formatted in the Indian style (1,50,000).

## Run it

No build step. It is plain HTML, CSS and JavaScript.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Put it on your phone

1. Host the folder anywhere that serves static files over HTTPS. The easiest option is **GitHub Pages**: repo **Settings → Pages → Deploy from a branch**, then pick the branch and the `/ (root)` folder.
2. Open the site in Chrome on your phone and choose **⋮ → Add to Home screen / Install app**.
3. It now opens like a normal app and works without internet.

## About your data

Everything is saved in the browser's local storage on that one device. Clearing the browser's site data or switching phones erases it, so use **More → Save backup** now and then. To move to a new phone, use **Restore** there.

## Files

```
index.html            app shell
css/style.css         styles (light + dark)
js/app.js             all app logic
sw.js                 offline support
manifest.webmanifest  install-as-app settings
icons/                app icons
```
