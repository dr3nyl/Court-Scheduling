# Owner Analytics & Helpful Features — Planning (No Implementation)

Skipping payment gateway for now. Focus: what the owner needs to run the venue (stats, insights, operations).

---

## 1. Statistics / Analytics (Your Ask)

### What the owner needs
- **Revenue for the day** — how much money came in (or is expected from bookings).
- **Games played in a day** — number of confirmed court bookings + completed queue matches.
- **Cancelled** — how many bookings/matches were cancelled (and optionally no-shows).

### Does a single table do this?

**You don’t need a new table for the raw data.** Everything can be derived from what you already have:

| Metric | Source |
|--------|--------|
| Revenue (expected) | `court_bookings` (date, start_time, end_time, court_id) × `courts.hourly_rate` for `status = 'confirmed'` |
| Games played (court bookings) | Count `court_bookings` where `status = 'confirmed'` and `date = day` |
| Games played (queue) | Count `queue_matches` where `status = 'completed'` and `date(start_time) = day` |
| Cancelled (court) | Count `court_bookings` where `status = 'cancelled'` and `date = day` |
| Cancelled (queue) | Only if you add a `cancelled` (or similar) status to `queue_matches` |

So: **one new table is optional**, and only if you want **pre-aggregated numbers for fast dashboards and future charts**.

- **Option A — No new table:**  
  Compute these numbers on demand (API that queries `court_bookings`, `queue_matches`, `courts` by date/owner). Fine for small data and simple “today’s stats” views.

- **Option B — One summary table (e.g. `owner_daily_stats`):**  
  One row per (date, owner_id) or (date, court_id) with columns like:  
  `total_revenue`, `bookings_confirmed`, `bookings_cancelled`, `queue_matches_completed`, `queue_matches_cancelled` (if you track that).  
  Updated by a daily job (or on booking/match change). Good for charts and “last 30 days” without heavy queries.

**Conclusion:** A single **summary** table is enough for all these visuals; the “single table” is for **aggregates**, not for storing each booking/match again. Charts can be added later on top of either Option A or B.

---

## 2. Other Owner-Helpful Features (No Payment, No Implementation Yet)

Ideas you can add later, without touching payment:

- **Reports export** — CSV/PDF for a date range (bookings, revenue, cancellations) for accounting or sharing.
- **Customer list** — Who booked, how often, last visit (from `court_bookings` + `users`).
- **Court utilization** — Used vs available slot hours per court/week (from `court_availabilities` vs `court_bookings`).
- **No-show / late cancellation** — Track and optionally flag repeat offenders; later you can block or charge (when payment exists).
- **Manual “collected” amount** — Optional field on booking (e.g. `amount_collected`) so “revenue for the day” = what was actually collected, not only computed from hourly rate.
- **Peak hours / popular days** — Simple aggregates from bookings and queue matches for pricing or staffing.
- **Owner dashboard summary** — Today’s bookings, today’s queue sessions, quick counts (confirmed / cancelled) and revenue; charts can sit on top of the same data later.

---

## 3. Suggested Order (When You Implement)

1. **API for “today” (and optional date range)** that returns, for the owner:
   - Revenue (expected from confirmed court bookings).
   - Games played (confirmed court bookings + completed queue matches).
   - Cancelled (court bookings; queue if you add cancelled status).
2. **Owner dashboard** — show these numbers for today (table or cards); charts later.
3. **Optional:** `owner_daily_stats` table + job to fill it, then switch dashboard/charts to use it.
4. **Later:** Reports export, customer list, utilization, no-show tracking, manual collected amount.

---

## 4. Small Schema Tweaks (If You Want Them Later)

- **Court bookings:** Optional `amount_charged` or `amount_collected` (decimal) so revenue can be stored per booking instead of only computed.
- **Queue matches:** Optional `cancelled` (or status like `cancelled`) so “cancelled games” and “games played” are clear for queue too.

No implementation in codebase yet; this doc is planning only.
