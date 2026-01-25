# Queue Tables – Relations

```
                    users (owner_id)
                         │
                         ▼
              ┌──────────────────────┐
              │   queue_sessions      │
              │   (1 per day/owner)   │
              └──────────┬───────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             │
┌──────────────────┐  ┌──────────────────┐
│  queue_entries   │  │  queue_matches   │◄──── courts (court_id)
│  (players)       │  │  (game on court) │
│  user_id or      │  └────────┬─────────┘
│  guest_name      │           │
└────────┬─────────┘           │
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  queue_match_players  │  (4 entries per match)
         │  (pivot)              │
         └──────────────────────┘
```

- **queue_sessions**: 1 owner, many entries, many matches.
- **queue_entries**: 1 session; linked to matches only via `queue_match_players`.
- **queue_matches**: 1 session, 1 court; 4 players via `queue_match_players`.
- **queue_match_players**: `queue_match_id` → `queue_entry_id` (4 rows per match).
