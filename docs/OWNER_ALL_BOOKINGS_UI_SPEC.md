# Owner "All Bookings" UI — Redesign Spec (Plan Only)

**Status:** Implemented. Default view on Owner "All Bookings" is now the schedule grid (by court & time) with date picker.

---

## Current behavior (for reference)

- **Grouping:** Date → Court → Player → time slots.
- **Views:** "Group by Date" (expandable date cards) and "Calendar" (monthly grid).
- **Filters:** All / Today / Upcoming / Cancelled, court filter, optional date filter.

---

## New design (to implement later)

### 1. Primary grouping: by court first

- The main structure is **one section per court** (not per date).
- Within the page, the user sees **one selected date** at a time (see date control below).

### 2. Per-court layout: two columns

For each court, show a simple table/grid:

| Column 1 — Time | Column 2 — Who booked |
|-----------------|------------------------|
| Fixed time slot (e.g. 8:00 AM) | Card or empty |
| Next slot (e.g. 9:00 AM) | Card or empty |
| … | … |

- **Column 1 (Time):** One row per time slot in the court’s operating hours (e.g. 8:00 AM–8:00 PM → 12 one-hour rows). Rows are **fixed** (always 12 rows for 12 slots), not driven by whether there is a booking.
- **Column 2 (Who booked):** For each row, either:
  - **Empty** if no booking in that slot for the selected date, or
  - **One card** containing:
  - **Player name** who booked
  - **Time booked** (e.g. `1:00 PM – 2:00 PM`)
  - **Current status** of the booking (e.g. Confirmed, Cancelled, etc.)

So the page is: **Court A** (Time | Booking card), **Court B** (Time | Booking card), etc., all for the **same selected date**.

### 3. Fixed rows from court schedule

- If the court schedule is **8:00 AM to 8:00 PM** with 1-hour slots, there are **12 rows** for that court.
- Rows are generated from the court’s schedule (start/end or slot length), not from the list of bookings. Empty slots still show the time in column 1 and an empty (or “Available”) state in column 2.

### 4. Date control (calendar / date picker)

- The page has a **date control** (e.g. calendar widget or date picker) so the owner can **change the date**.
- The grid (all courts, all time slots) always reflects **that selected date**.
- Optional: “Today” quick action to jump to the current date.

---

## Summary

| Aspect | New design |
|--------|------------|
| **Grouping** | By **court** first; one date for the whole page. |
| **Columns per court** | 1) **Time** (fixed slots), 2) **Who booked** (card: player name, time range, status). |
| **Rows** | Fixed from court schedule (e.g. 8am–8pm → 12 rows). |
| **Date** | Single selected date, changeable via calendar/date picker on the page. |

No implementation yet — this document is the spec for when you are ready to build.
