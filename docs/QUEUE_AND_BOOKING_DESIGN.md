# Court Scheduling: Booking and Queueing (Separate Systems)

This document describes **two separate systems** in the app:

1. **Booking system** (existing) – advance reservations with fixed date and time.
2. **Queueing system** (new) – Queue Master (QM) driven, level-based automatic matching. **All courts are used only for queueing** in this mode (no advance booking in the queue world).

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COURT SCHEDULING APP                                      │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│     BOOKING SYSTEM (existing)         │     QUEUEING SYSTEM (new)                 │
│     • Advance reservations            │     • Queue Master (QM) registers players │
│     • Fixed date + time                │     • Players have LEVELS                │
│     • Player picks slot                │     • Auto-match by level when court     │
│     • CourtBooking                     │       is free                             │
│     • Courts: bookable slots           │     • Courts: free or in-use (matches)    │
│                                        │     • All courts = queueing only here    │
└──────────────────────────────────────┴──────────────────────────────────────────┘

No coupling: Booking and Queueing are independent. A venue uses one or the other (or both in different areas / times).
```

---

## 2. Queueing System: Queue Master (QM) Model

The **Queue Master (QM)** is the **person** (staff/referee) who runs the queue. The **system** supports the QM: fast registration (name, level, etc.), picking 1 available court, level-based match suggestions, and **games_played** for payment at exit.

- **Queue Master (QM)** – Person who: (1) **registers players quickly** (name, level, etc.), (2) **picks 1 available court** when assigning a match, (3) reviews the system's level-based match suggestion and assigns (or overrides). All games are **doubles only** (4 players per match).
- **Players** – Have a **level** (e.g. 3.0, 3.5, 4.0, 4.5). QM registers: **name**, **level**, and optional fields (e.g. phone, notes). Can be an existing user or a **guest** (quick-add, name + level only).
- **Courts** – **All courts** are for **queueing only** in this flow. A court is **free** (no active match) or **in use** (has an active `queue_match`). QM **picks 1 available court** when assigning a match.
- **Matching** – The **system suggests 4 players** using **level-matching logic**. Matches can be **mixed levels** (not all 4 same) as long as the group is “matched” (balanced; see §7). QM can accept or change the suggestion, then assign to the chosen court.
- **Games played & payment at exit** – The system **logs how many times each player played** in that queue session (day). When a player **exits** the queue, that **play count determines how much they pay** (pricing rules TBD: e.g. per game, tiers).
- **Flow** – QM registers players → players wait in queue → QM picks an available court → system suggests 4 players by level → QM assigns → match runs → match ends (system increments each player’s **games_played**) → players go back to `waiting` or **exit** (status `left`/`done`; at exit, games_played is used for payment). Court becomes free again.

---

## 3. Roles

| Role | Description |
|------|-------------|
| `player` | Books courts (booking system) and/or is added to the queue (queueing system). Has a **level** for queueing. |
| `owner` | Owns courts, manages availability and bookings. Can also have queueing courts. |
| `queue_master` | **New.** Registers players into the queue, checks available courts, sees suggested matches, assigns matches to courts. Typically tied to an owner’s venues (QM works at owner’s courts). |

- `users.role`: `player` | `owner` | `queue_master`. (An owner could also be a QM for their own courts.)

---

## 4. Player Data When QM Registers

- **Level** = skill rating (e.g. 3.0, 3.5, 4.0, 4.5 – NTRP-style, or 1–5). Required for matching.
- **Name**: from `user.name` (if registered) or `guest_name` (if guest). **Level**, and optional **phone**, **notes** (the “etc”). Stored on `queue_entries`; `users.level` is the default when adding a user, overridable per entry.
- When **QM registers**:
  - **Registered user**: `user_id`; `level` from `users.level` or **override**; optional `phone`, `notes`.
  - **Guest (quick-add)**: `guest_name` + `level`; optional `phone`, `notes`. No `user_id`.
- Matching uses `queue_entries.level`.

---

## 5. Data Model: Queueing

### 5.1 Queue session (optional but useful)

A **queue session** = one continuous block of queueing (e.g. “Tuesday 6–9pm open play”). All queue entries and matches belong to a session. Simplifies “today’s queue” per owner.

**`queue_sessions`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | PK |
| `owner_id` | FK users | whose courts |
| `date` | date | session date |
| `start_time` | time | when queue opens |
| `end_time` | time, nullable | when it closes (optional) |
| `status` | enum | `upcoming`, `active`, `ended` |
| `created_at`, `updated_at` | | |

- **Doubles only**: every match has **4 players**. No singles.
- Courts in the pool: **all courts of `owner_id`** (or a link table `queue_session_courts` if you want to limit). For “all courts for queueing,” use all owner’s courts.

### 5.2 Queue entries (players in the queue)

**`queue_entries`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | PK |
| `queue_session_id` | FK | which session |
| `user_id` | FK users, nullable | null if guest |
| `guest_name` | string, nullable | when user_id is null (QM quick-add) |
| `level` | decimal(2,1) | e.g. 3.5, 4.0. From user or override or guest. |
| `phone` | string, nullable | optional; for contact. |
| `notes` | text, nullable | optional; QM notes. |
| `status` | enum | `waiting`, `matched`, `playing`, `done`, `left` |
| `games_played` | int, default 0 | **how many matches** this player played in this session. Incremented when a match they’re in is **completed**. Used at **exit** to compute payment. |
| `joined_at` | timestamp | |
| `created_at`, `updated_at` | | |

- **Ordering for display**: by `joined_at` (FIFO).  
- **Matching**: by `level` (see §7).  
- **Payment at exit**: when status becomes `left` or `done`, `games_played` determines how much the player pays (pricing rules TBD: e.g. rate per game, tiers). Do **not** delete the row on exit; keep it for records and billing.
- `user_id` + `guest_name`: exactly one set. If `user_id` present, `guest_name` null; if guest, `user_id` null. **Name** for display: `user.name` or `guest_name`.

### 5.3 Queue matches (a game on a court)

**`queue_matches`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | PK |
| `queue_session_id` | FK | |
| `court_id` | FK | |
| `status` | enum | `active`, `completed` |
| `start_time` | timestamp | when match started |
| `end_time` | timestamp, nullable | when completed |
| `created_at`, `updated_at` | | |

**`queue_match_players`** (who is in the match)

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | PK |
| `queue_match_id` | FK | |
| `queue_entry_id` | FK | links to queue_entries (has level, user/guest) |
| `created_at` | | |

- While `queue_matches.status = active`, that **court is in use**.  
- **Available courts for queueing** = courts in the session with **no** `queue_match` where `status = active` for that session.

### 5.4 Users: level and role

**`users`** (additions)

| Column | Type | Description |
|--------|------|-------------|
| `level` | decimal(2,1), nullable | default level for queueing |
| `role` | enum | already exists; add `queue_master` |

---

## 6. Courts in Queueing

- **All courts** of the owner (in the session) are **for queueing only** in this flow: no advance booking in the queueing system.
- **Available for queueing** = court has no **active** `queue_match` in the current session.
- QM “checks available courts” = `GET /queue/sessions/{id}/available-courts` → list courts with no active match.

---

## 7. Level-Based Matching (Automatic)

**Doubles only**: always **4 players** per match.  
A match does **not** require all 4 to have the **same** level. **Mixed levels are allowed** as long as the group is **“matched”** (balanced). The system suggests 4 players; QM can accept or override.

**When a court is free** and there are ≥ 4 `queue_entries` with `status=waiting`:

1. **“Matched”** = the 4 players form a **balanced** group. Definitions (configurable):
   - **Max spread**: the difference between the highest and lowest level in the foursome is ≤ threshold (e.g. 1.0). Example: 3.5, 3.5, 4.0, 4.0 → spread 0.5 ✓.
   - **Doubles balance** (optional): if we consider two pairs (Team A vs Team B), the **average level of each pair** is similar (e.g. 3.5+4.0 vs 3.5+4.0). This keeps games competitive.
   - **Average in range**: the foursome’s average is within a band; individuals can mix (e.g. 3.0, 3.5, 4.0, 4.5 → avg 3.75; all within 1.5 of each other).
2. **Algorithm** (simplified): prefer 4 at the **same level**; if not enough, take 4 with the **smallest max spread** (and optionally balanced pairs). **FIFO within** a valid group when there are ties.
3. Return a **suggested match**: list of 4 `queue_entry_id`s. QM can **accept** or **override** (manually pick 4 from the queue).

**Examples (doubles, 4 per match)**  
- Queue: A 3.5, B 4.0, C 4.0, D 4.0, E 4.0. Suggestion: B, C, D, E (four 4.0s). A stays.  
- Queue: A 3.0, B 3.5, C 3.5, D 4.0. Suggestion: A, B, C, D (mixed; spread 1.0) if that meets the “matched” rule.  
- Queue: A 3.0, B 3.0, C 4.5, D 4.5. Suggestion: could be A, B, C, D (spread 1.5) or two pairs 3.0+4.5 vs 3.0+4.5 depending on the chosen “matched” definition.

---

## 8. Flows

### 8.1 Queue Master: Start / view session

- QM (or owner) starts or opens an **active** `queue_session` for today (or a chosen date).
- QM sees: **queue** (waiting players with level) and **available courts** (courts with no active match).

### 8.2 QM: Register players quickly

- **By user**: search/select user → level from `users.level` or override → create `queue_entry` (status `waiting`).
- **Quick-add (guest)**: `guest_name` + `level` → create `queue_entry` with `user_id=null`, `guest_name` set, status `waiting`.

### 8.3 QM: Check available courts

- `GET /queue/sessions/{id}/available-courts` → courts in the session that have no active `queue_match`.

### 8.4 System: Suggest match when court is free

- QM **picks 1 available court**, then asks for a suggestion: `POST /queue/sessions/{id}/suggest-match` body `{ "court_id": 1 }`.
- Backend: among `queue_entries` with `status=waiting`, run **matching by level** (see §7) for **4 players** (doubles only).
- Response: `{ "suggested": [ { "queue_entry_id", "level", "name" (user.name or guest_name) } ] }`. If not enough players, return `{ "suggested": [] }`.

### 8.5 QM: Assign match to court

- QM uses the suggestion or **manually picks 4** from the queue. `POST /queue/matches` with `{ "queue_session_id", "court_id", "queue_entry_ids": [ id1, id2, id3, id4 ] }`.
- Backend:
  1. Create `queue_match` (court_id, status `active`, start_time now).
  2. Create `queue_match_players` for each of the 4 `queue_entry_id`s.
  3. Set those 4 `queue_entries.status = 'playing'`.

### 8.6 Match ends

- QM: `PATCH /queue/matches/{id}` with `{ "status": "completed", "end_time": "..." }`.
- Backend:
  1. **Increment `games_played`** for each of the 4 `queue_entries` in that match (via `queue_match_players`).
  2. Set those 4 `queue_entries.status` back to **`waiting`** (they re-join the queue) unless QM or player marks them as `done`/`left` (exiting).
  3. Court is now **free** again.
- **Re-use the same `queue_entry`** when they go back to `waiting`; do not create a new one. `games_played` keeps accumulating for that session.

### 8.7 Exit (check out) and payment

- When a player **exits** the queue for the day: set `queue_entry.status = 'left'` or `'done'` (via `PATCH /queue/entries/{id}` or an explicit “Check out” action).
- **Do not delete** the `queue_entry`; keep it for records.
- At exit, the system (or QM UI) uses **`games_played`** to compute **how much the player pays**. Pricing rules TBD (e.g. rate per game, tiered). Example: 3 games × $5 = $15. The API can return `{ "queue_entry_id", "games_played", "amount_due" }` when `status` becomes `left`/`done`, or the frontend computes from `games_played` and a configurable rate.

- **Leaving**: `PATCH /queue/entries/{id}` with `{ "status": "left" }` (or `"done"`). Player can do it for their own entry; QM can do it for any. This is the “exit” that triggers payment based on `games_played` (see 8.7 above).

---

## 9. API (Queueing)

### Session

- `GET /queue/sessions` – list for owner (or QM) by date/status.
- `POST /queue/sessions` – create (owner/QM): `{ owner_id implied, date, start_time, end_time? }`. Doubles only (4 players per match).
- `GET /queue/sessions/{id}` – detail + queue entries + active matches.
- `PATCH /queue/sessions/{id}` – e.g. `status=active|ended`.
- `GET /queue/sessions/{id}/available-courts` – courts with no active match.

### Queue entries (QM registers)

- `GET /queue/sessions/{id}/entries` – list entries (status, level, name, **games_played**, user/guest, phone, notes).
- `POST /queue/sessions/{id}/entries` – add: `{ "user_id" }` or `{ "guest_name", "level" }`; optional: `level` (override), `phone`, `notes`.
- `PATCH /queue/entries/{id}` – e.g. `status=left` or `done` (exit; use `games_played` for payment), or `level`, `phone`, `notes`.
- `DELETE /queue/entries/{id}` – remove from queue (QM or self if allowed). Prefer `PATCH status=left` for exit so `games_played` is kept for billing.

### Matching and matches

- `POST /queue/sessions/{id}/suggest-match` – body `{ "court_id" }` → `{ "suggested": [ ... ] }`.
- `POST /queue/matches` – create: `{ "queue_session_id", "court_id", "queue_entry_ids": [ ... ] }`.
- `PATCH /queue/matches/{id}` – e.g. `status=completed`, `end_time`.

### Players (optional)

- `GET /queue/entries/mine` – my entries in `waiting` or `playing` (for “My queue” UX).

---

## 10. Frontend (Queueing)

### Queue Master (QM)

- **Session**: start/open session, see date. Doubles only (4 per match).
- **Register**: quick form – **name**, **level**, and optional (phone, notes). “Add user” (typeahead, level from profile or override) or “Add guest” (name + level). List of `queue_entries` with: waiting, level, name, **games_played**.
- **Courts**: “Available courts” (from `available-courts`). QM **picks 1** when assigning. “In use” = courts with active match.
- **Matching**: for the chosen **free court**, “Suggest match” → system suggests 4 players (mixed levels allowed; see §7). QM can edit and “Assign to court”. After assign, match on that court; those 4 entries → `playing`.
- **Match over**: “End match” → system increments **games_played** for the 4 players; they go back to `waiting` (or QM can mark `left`/`done` if they’re exiting). Court becomes free.
- **Queue**: for each entry: “Remove” or “Exit” (status `left`/`done`). On **Exit**, show **Games played: X** and **Amount due: $Y** (from `games_played` and pricing rule; pricing TBD).

### Player (in queueing context)

- “My queue” (if they have an account and are in the queue): position, level, status (waiting / playing). When `playing`, show court and “Match in progress.”
- Joining: in this model, **QM registers**; players don’t self-serve join. (If you add self-join later, `POST /queue/sessions/{id}/entries` with `user_id` from auth and `users.level`.)

---

## 11. Booking System (Unchanged)

- **Booking** remains: `CourtBooking`, date + start/end, court availability, overlap checks.
- **Courts** in the **booking** system are separate from “courts in a queue session.” An owner can:
  - use **some courts for booking only** and **others for queueing only**, or  
  - use **all courts for queueing** (as you specified) and **none for booking** at that venue, or  
  - use **booking** at some times and **queueing** at others (different `queue_sessions` vs availability).

No waitlist, no walk-in queue in the sense of the previous design. Queueing is **only** the QM + level-based matching model above.

---

## 12. Implementation Order

1. **Roles and users**
   - Add `queue_master` to `users.role`.
   - Add `users.level` (nullable).

2. **Migrations**
   - `queue_sessions`
   - `queue_entries`
   - `queue_matches`
   - `queue_match_players`

3. **Models**
   - `QueueSession`, `QueueEntry`, `QueueMatch`, `QueueMatchPlayer` with relations.

4. **QM: sessions and entries**
   - CRUD for `queue_sessions` (create, list, open/close). Doubles only.
   - `POST /queue/sessions/{id}/entries` (add user or guest: name, level, optional phone/notes); list entries with **games_played**.

5. **Available courts and suggest-match**
   - `GET /queue/sessions/{id}/available-courts`. QM picks 1 when assigning.
   - `POST /queue/sessions/{id}/suggest-match` with **mixed-level** matching (see §7).

6. **Matches**
   - `POST /queue/matches` (assign 4 entries to court), `PATCH` to complete. On complete: **increment games_played** for the 4 players; set status back to `waiting` (or `left`/`done` if exiting).

7. **QM UI**
   - Session, register (name, level, phone?, notes?), queue list with **games_played**, available courts, suggest (mixed levels) → assign, end match (**increment games_played**), **Exit/Check out** (show games_played and amount due; pricing TBD).

8. **Player “My queue”** (optional)
   - `GET /queue/entries/mine` and a simple status view.

---

## 13. Summary

- **Booking** and **Queueing** are **separate**. No interaction.
- **Queueing**:
  - **Queue Master (QM)** = the **person**. System supports: (1) **quick register** (name, level, phone?, notes?; user or guest), (2) **pick 1 available court** when assigning, (3) **level-based match suggestion** (mixed levels allowed; “matched” = balanced). **Doubles only** (4 players per match).
  - **Games played**: system **logs how many matches** each player played in the session (`queue_entries.games_played`). **At exit** (status `left`/`done`), **games_played determines how much they pay** (pricing TBD).
  - **All courts** are for **queueing only** (free vs in-use by `queue_matches`). QM picks 1 available court when assigning.
- **Data**: `queue_sessions`, `queue_entries` (user or guest, name, level, phone?, notes?, **games_played**), `queue_matches`, `queue_match_players`. `users.level` and role `queue_master`.
