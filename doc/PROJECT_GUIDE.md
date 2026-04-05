# 📊 Income Manager - Project Guide

This document provides a complete overview of the **Income Manager** application for future AI agents or developers to understand the project structure, database, and logic.

---

## 🚀 Project Overview
A specialized Next.js application designed to manage long-term income sources (e.g., salary/installments) and track how those funds are distributed across multiple recipients (personal accounts, family, bills).

### Key Features:
- **Visual Analytics**: Interactive Donut and Bar charts for income and spending trends (via `recharts`).
- **One-Click Distribution**: Save and reuse payment pattern templates for fast monthly distributions.
- **Savings Goals**: Track progress towards long-term big purchases with animated progress bars.
- **Multi-Currency Intelligence**: Consolidated "Net Worth" card that converts DKK, SEK, and EUR balances.
- **Reporting**: Exportable monthly summaries and balance receipts as PDFs.
- **Smart Reminders**: Dashboard banners that alert if a monthly withdrawal is overdue.
- **Payment Ledger**: Personal salary & payment receipt history — a backward-looking log of every payment received, from any payer.

---

## 📁 Application Structure

```text
/src
  /app           -> Next.js 14 App Router (React Server components & Client components)
    /contacts    -> CRM for donors, recipients, and bills
    /income      -> Management of money-in sources
    /withdrawals -> Money-out tracking & distribution logic
    /ledger      -> Personal payment receipt history (backward-looking salary log)
    /savings     -> Savings goals tracking & progress UI
    /reports     -> PDF generation & year-over-year summaries
    /api         -> (Optional) Backend routes if needed
  /components    -> Reusable UI (Modals, CustomSelect, Sidebar, Toast)
  /context       -> Global state (Language/RTL, Theme/Color palettes)
  /lib           -> Business logic, API actions, and shared utilities
/database        -> SQLite connection and schema definition
/data            -> (Persistent) SQLite database file storage
```

---

## 🗄️ Database Schema
The app uses **SQLite** (via `better-sqlite3`) located at `/data/income.db`.

### 1. `contacts`
Stores all people and entities involved.
- `id` (PK)
- `name` (e.g., "Company X", "Wife", "Apartment Rent")
- `type` (`person`, `bank_account`, `company`, `expense`)
- `notes`

### 2. `income_sources`
Money-in contracts or sources.
- `contact_id` (FK -> contacts)
- `total_amount` (Total money to be received)
- `monthly_amount` (Amount to take every month)
- `total_months` (Duration of the source)
- `status` (`active`, `completed`, `paused`)

### 3. `withdrawals`
The act of taking money from a source. One withdrawal = One month of funds.
- `income_source_id` (FK -> income_sources)
- `amount` (Usually matching monthly_amount)
- `month_number` (Tracker)
- `month_label` (e.g., "March 2026")

### 4. `distributions`
Splitting a withdrawal among destinations.
- `withdrawal_id` (FK -> withdrawals)
- `contact_id` (FK -> contacts, recipient)
- `amount`
- `method` (`bank_transfer`, `cash`, `revolut`, `other`)

### 5. `distribution_templates`
Saves a pattern of recipients and amounts for reuse.
- `id` (PK)
- `name` (e.g., "Monthly Family Support")
- `template_json` (JSON blob of recipients and amounts)

### 6. `savings_goals`
Targets for saving money over time.
- `id` (PK)
- `name` (e.g., "New Car")
- `target_amount`
- `current_amount`
- `currency`
- `deadline`
- `status` (`active`, `reached`)

### 7. `salary_receipts`
Personal payment receipt log — each row is a real payment Ahmad received.
- `id` (PK)
- `payer_contact_id` (FK → contacts, nullable — if payer is in contacts)
- `payer_name_custom` (free text — for gifts, winnings, unknown payers)
- `amount`
- `currency` (DKK, EUR, SEK, USD, GBP)
- `received_date` (actual date money was received)
- `work_period_from` / `work_period_to` (optional: work period the salary covers)
- `category` (`salary`, `project`, `bonus`, `gift`, `other`)
- `description` (free text note)

---

## 🎨 UI/UX Design Standards
- **Icons**: Use `lucide-react` exclusively. No emojis in the UI.
- **Theming**: Driven by CSS variables inside `globals.css`. Supports Light/Dark mode and 5 accent color palettes (Blue, Violet, Emerald, Rose, Amber).
- **Dynamic Attributes**: `[data-theme="dark"]` and `[data-color="violet"]` are used on the root element.
- **Modals**: Custom implementation that prevents accidental closing on outside-click.
- **Form Inputs**: Custom `CustomSelect` component replaces native selects for better animation and theme integration.

---

## 🛡️ Important Logic Rules
1. **Balance Integrity**: `income_source.total_withdrawn` must be tracked to calculate `remaining` balance.
2. **Contact Deletion**: Restricted if the contact is tied to an active income source or distribution.
3. **Receipt View PDF**: Generates a card-based layout with progress bars showing usage of each income source.
4. **Expense Handling**: Use `contact.type = 'expense'` for recurring bills like rent. 
5. **Currency Conversion**: Uses static baseline rates in `src/lib/utils.js` (DKK: 1.0, EUR: 7.45, SEK: 0.65).
6. **Smart Reminders**: Alerts trigger if a withdrawal `month_label` does not match the system's current `Month Year` for an active source.
