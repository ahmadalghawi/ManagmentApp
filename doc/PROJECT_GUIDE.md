# 📊 MeM (Manage Me) - Project Guide

This document provides a complete overview of the **MeM (Manage Me)** application for future AI agents or developers to understand the project structure, database, and logic.

---

## 🚀 Project Overview
A specialized Next.js application designed to manage long-term income sources (e.g., salary/installments) and track how those funds are distributed across multiple recipients (personal accounts, family, bills).

### Key Features:
- **Visual Analytics**: Interactive Donut and Bar charts for income and spending trends (via `recharts`).
- **One-Click Distribution**: Save and reuse payment pattern templates for fast monthly distributions.
- **Savings Goals**: Track progress towards long-term big purchases with animated progress bars.
- **Multi-Currency Intelligence**: Consolidated "Net Worth" card that converts DKK, SEK, and EUR balances.
- **Reporting**: Exportable monthly summaries and balance receipts as PDFs.
- **Payment Ledger**: Personal salary & payment receipt history — a backward-looking log of every payment received, from any payer.
- **Time Tracker**: Log daily work hours for clients/projects with hourly rates and payment status (Unpaid, Invoiced, Paid).
- **Desktop Ready**: Fully integrated with Electron for native Windows support (Standalone UI window).

---

## 📁 Application Structure

```text
/src
  /app           -> Next.js 16.2 App Router (React Server components & Client components)
    /contacts    -> CRM for donors, recipients, and bills
    /income      -> Management of money-in sources
    /withdrawals -> Money-out tracking & distribution logic
    /ledger      -> Personal payment receipt history (backward-looking salary log)
    /timelog     -> Time-tracking logs for work hours and billing status
    /savings     -> Savings goals tracking & progress UI
    /reports     -> PDF generation & year-over-year summaries
  /components    -> Reusable UI (Modals, CustomSelect, Sidebar, Toast)
  /context       -> Global state (Language/RTL, Theme/Color palettes)
  /electron      -> Electron main & preload scripts for Desktop App mode
/database        -> SQLite connection and schema definition
/data            -> (Persistent) Local database storage (Fallback only)
```

---

## 💻 Desktop App (Electron)

The application has been converted to run as a native desktop window.

### Key Desktop Features:
- **MeM Icon**: A sleek, modern bold "MeM" icon in dark 3D glassmorphism.
- **Minimize to Tray**: Closing the main window (`X`) minimizes the app to the System Tray.
- **Tray Menu**: Right-click context menu in the tray for "Show App" and "Exit / Close App" (Total app quit).
- **AppData Storage**: In desktop mode, the database and logs are stored in `%APPDATA%/income-manager/data/` for persistence across installs.
- **Embedded Server**: Starts a Next.js server programmatically on port 3000 inside the Electron process.

---

## 🗄️ Database Schema

### 7. `salary_receipts`
Personal payment receipt log — each row is a real payment received (Salary, Project, Gift, etc.).
- `id` (PK)
- `payer_contact_id` (FK → contacts, nullable)
- `amount`, `currency` (DKK, EUR, SEK, USD, GBP)
- `received_date`, `category`, `description`

### 8. `work_logs` (Time Tracker)
History of tracked work hours for various contacts/projects.
- `id` (PK)
- `contact_id` (FK → contacts, nullable)
- `project_name` (string)
- `log_date` (actual work date)
- `hours` (REAL)
- `hourly_rate`, `currency`
- `status` (`unpaid`, `invoiced`, `paid`)

---

## 🛡️ Important Logic Rules
1. **Desktop Pathing**: `db.js` dynamically switches between local `data/` and `%APPDATA%` based on `process.env.APP_DATA_PATH`.
2. **Withdrawal Update**: Added logic to Edit/Update a withdrawal, including modifying amounts and month labels without breaking distribution history.
3. **Time-Log Visibility**: Fixed `z-index` and `overflow: visible` issues in grid containers for `CustomSelect` dropdown reliability.
4. **Currency Handling**: Manual rate conversion (DKK 1.0, EUR 7.45, SEK 0.65) is used for dashboard-wide net worth calculations.
5. **System Tray Integration**: `app.isQuitting` flag controls whether the app hides or terminates when closing the window.
