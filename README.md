# IMSCCA

IMSCCA is a club operations system for member invitations, requirements, fees, approvals, attendance, QR check-in, history, and operational reports.

## Local startup

1. Start Apache and MySQL from XAMPP.
2. Deploy the canonical PHP backend: `powershell -ExecutionPolicy Bypass -File scripts/deploy-backend.ps1`.
3. Start the frontend and notification server together: `npm run dev:all`.
4. Open `http://localhost:5173`.

The individual development commands remain available:

- `npm run dev` starts Vite on port 5173.
- `npm run dev:socket` starts Socket.IO on port 3001.
- `npm run dev:tunnel` starts Vite for a forwarded port without its unsupported HMR WebSocket.
- `npm run dev:all:tunnel` starts both Socket.IO and tunnel-mode Vite.

Vite proxies `/my-app-server` to XAMPP Apache and `/socket.io` to port 3001. Generated registration links therefore use the current localhost or Dev Tunnel origin.
Tunnel mode disables only Vite hot reload; IMSCCA Socket.IO notifications remain enabled.
The combined launcher requires ports `5173` and `3001` to be free and exits with a clear message instead of silently starting duplicate processes on another port.

## Database

- Clean installation: import `db_imscca/db_imscca.sql`.
- Existing installation: back up the database, then apply migrations in `db_imscca/migrations` in filename order.
- Optional environment variables: `IMSCCA_DB_HOST`, `IMSCCA_DB_NAME`, `IMSCCA_DB_USER`, `IMSCCA_DB_PASSWORD`, `IMSCCA_TIMEZONE`, and `IMSCCA_SESSION_PATH`.

The default XAMPP configuration uses database `db_imscca`, user `root`, a blank password, and timezone `Asia/Manila`.

## Event lifecycle

Run the idempotent worker manually:

```powershell
D:\XAMPP\php\php.exe src\my-app-server\lifecycle_worker.php
```

Install the one-minute Windows scheduled task from an elevated PowerShell terminal:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-lifecycle-task.ps1
```

## Member imports

CSV files must be UTF-8 and use this exact header:

```csv
school_id,email,first_name,middle_name,last_name,course,year,section
```

Preview validates every row. Commit creates identity-bound, one-time member registration links and never creates shared passwords.

## Verification

```powershell
npm run build
npm run lint
Get-ChildItem src\my-app-server\*.php | ForEach-Object { D:\XAMPP\php\php.exe -l $_.FullName }
```
