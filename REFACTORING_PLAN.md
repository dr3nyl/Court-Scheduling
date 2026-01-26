# Backend Refactoring Plan: Service Layer Implementation

## Overview
This plan outlines the refactoring strategy to separate business logic from controllers by introducing a service layer. This will improve code maintainability, testability, and reusability.

## Current Issues Identified

### 1. **Business Logic in Controllers**
- Complex algorithms (match suggestion, team balancing) are embedded in controllers
- Database queries mixed with business rules
- Data transformation logic in controllers
- Authorization logic duplicated across controllers

### 2. **Code Duplication**
- Court availability checking logic appears in multiple controllers
- Authorization checks (`authorizeSession`) duplicated in `QueueMatchController` and `QueueSessionController`
- Similar validation patterns repeated

### 3. **Testability Concerns**
- Business logic tightly coupled to HTTP layer makes unit testing difficult
- Complex methods are hard to test in isolation

### 4. **Single Responsibility Violation**
- Controllers handling HTTP concerns, validation, authorization, business logic, and data access

---

## Proposed Service Layer Structure

### Directory Structure
```
backend/app/
├── Services/
│   ├── QueueSessionService.php
│   ├── QueueMatchService.php
│   ├── QueueEntryService.php
│   ├── CourtService.php
│   ├── CourtBookingService.php
│   └── MatchSuggestionService.php
├── Policies/
│   └── QueueSessionPolicy.php
└── Http/
    └── Controllers/
        └── (simplified controllers)
```

---

## Service Layer Breakdown

### 1. **QueueSessionService**
**Purpose**: Handle all business logic related to queue sessions

**Methods to Extract**:
- `createSession(array $data, User $user): QueueSession`
  - Extract from `QueueSessionController::store()`
  - Handle owner_id determination logic
  - Validate business rules
  
- `getAvailableCourts(QueueSession $session): Collection`
  - Extract from `QueueSessionController::availableCourts()`
  - Check court availability for a session
  
- `getAllCourtsWithStatus(QueueSession $session): Collection`
  - Extract from `QueueSessionController::allCourts()`
  - Complex logic for formatting court status with teams
  - Transform match data into team structure
  
- `getSessionWithRelations(QueueSession $session): QueueSession`
  - Extract eager loading logic from `QueueSessionController::show()`
  - Add computed attributes (completed_matches_count)

**Business Logic to Move**:
- Owner ID determination based on user role
- Court availability filtering
- Match status formatting and team organization
- Session status management

---

### 2. **QueueMatchService**
**Purpose**: Handle match creation, completion, and team assignment

**Methods to Extract**:
- `createMatch(array $data, QueueSession $session): QueueMatch`
  - Extract from `QueueMatchController::store()`
  - Validate court availability
  - Handle team-based assignment (new format)
  - Handle legacy queue_entry_ids format
  - Create match and assign players to teams
  - Update queue entry statuses
  
- `completeMatch(QueueMatch $match, ?int $shuttlecocksUsed): QueueMatch`
  - Extract from `QueueMatchController::update()`
  - Update match status to completed
  - Increment games_played for all players
  - Reset entry statuses to 'waiting'
  - Set end_time

**Business Logic to Move**:
- Court availability validation for matches
- Team assignment logic (Team A/B)
- Player uniqueness validation
- Entry status transitions
- Games played tracking

---

### 3. **MatchSuggestionService**
**Purpose**: Handle complex match suggestion algorithm

**Methods to Extract**:
- `suggestMatch(QueueSession $session, int $courtId): array`
  - Extract entire algorithm from `QueueSessionController::suggestMatch()`
  - Level-based matching logic
  - Team balancing calculations
  - Bracket determination
  - Combination generation

**Business Logic to Move**:
- Level bracket calculation (beginner/intermediate/advanced)
- Balanced doubles team validation
- Average level difference calculations
- FIFO + games_played prioritization
- All combination generation logic

**Note**: This is a complex algorithm that benefits greatly from being in a dedicated service for:
- Unit testing
- Potential future algorithms (round-robin, skill-based, etc.)
- Reusability

---

### 4. **QueueEntryService**
**Purpose**: Handle queue entry operations

**Methods to Extract**:
- `createEntry(array $data, QueueSession $session): QueueEntry`
  - Extract from `QueueSessionController::storeEntry()`
  - Handle user vs guest entry creation
  - Level determination logic (user default vs provided)
  
- `updateEntry(QueueEntry $entry, array $data): QueueEntry`
  - Extract from `QueueEntryController::update()`
  - Status transition validation
  - Level validation

**Business Logic to Move**:
- User/guest entry validation
- Default level assignment
- Entry status management

---

### 5. **CourtService**
**Purpose**: Handle court-related business logic

**Methods to Extract**:
- `getAvailableTimeSlots(Court $court, string $date): array`
  - Extract from `CourtController::availableForPlayers()`
  - Generate hourly time slots
  - Check booking overlaps
  - Filter by court availability schedule

**Business Logic to Move**:
- Time slot generation
- Booking overlap detection
- Day-of-week availability matching
- Slot availability calculation

---

### 6. **Authorization Layer (Policies)**
**Purpose**: Centralize authorization logic

**Create**: `QueueSessionPolicy`
- `viewAny(User $user): bool`
- `view(User $user, QueueSession $session): bool`
- `create(User $user): bool`
- `update(User $user, QueueSession $session): bool`
- `delete(User $user, QueueSession $session): bool`

**Benefits**:
- Replace duplicate `authorizeSession()` methods
- Use Laravel's built-in authorization system
- Can be used in middleware, controllers, and services
- Better testability

---

## Refactoring Steps (Implementation Order)

### Phase 1: Foundation
1. **Create base Service class** (optional, for common functionality)
2. **Create QueueSessionPolicy** to replace authorization duplication
3. **Update controllers to use policy** instead of private methods

### Phase 2: Simple Services First
4. **Create QueueEntryService**
   - Start with simpler CRUD operations
   - Extract entry creation/update logic
   
5. **Create CourtService**
   - Extract time slot generation logic
   - Isolate booking overlap calculations

### Phase 3: Complex Services
6. **Create MatchSuggestionService**
   - Extract entire suggestion algorithm
   - This is the most complex, benefits most from isolation
   
7. **Create QueueMatchService**
   - Extract match creation logic
   - Extract match completion logic
   - Handle team assignment complexity

8. **Create QueueSessionService**
   - Extract session management logic
   - Extract court status formatting
   - Extract available courts logic

### Phase 4: Controller Cleanup
9. **Refactor controllers** to use services
   - Controllers should only:
     - Validate HTTP input (Laravel validation)
     - Call service methods
     - Format HTTP responses
     - Handle authorization (via policies)

10. **Remove duplicate code**
    - Remove private authorization methods
    - Remove business logic from controllers
    - Simplify controller methods

---

## Controller Responsibilities (After Refactoring)

### What Controllers Should Do:
✅ Receive HTTP requests
✅ Validate request data (Laravel validation rules)
✅ Authorize actions (using Policies)
✅ Call service methods
✅ Format and return HTTP responses
✅ Handle HTTP-specific concerns (status codes, headers)

### What Controllers Should NOT Do:
❌ Direct database queries (except simple lookups)
❌ Complex business logic
❌ Data transformation (beyond simple formatting)
❌ Authorization logic (use Policies)
❌ Algorithm implementations

---

## Example: Before vs After

### Before (QueueMatchController::store)
```php
public function store(Request $request)
{
    // Validation
    $request->validate([...]);
    
    // Authorization
    $session = QueueSession::findOrFail(...);
    $this->authorizeSession($request, $session);
    
    // Business Logic: Court availability check
    $availableCourtIds = Court::where(...)->whereDoesntHave(...)->pluck('id');
    if (!in_array($courtId, $availableCourtIds)) {
        return response()->json([...], 422);
    }
    
    // Business Logic: Team assignment
    if ($request->has('teamA') && $request->has('teamB')) {
        // Complex team validation and assignment...
    }
    
    // Business Logic: Match creation
    $match = QueueMatch::create([...]);
    
    // Business Logic: Player assignment
    foreach ($teamAIds as $entryId) {
        // Create match players...
        $entry->update(['status' => 'playing']);
    }
    
    // Data transformation
    $match->load([...]);
    
    return $match;
}
```

### After (QueueMatchController::store)
```php
public function store(Request $request)
{
    $request->validate([...]);
    
    $session = QueueSession::findOrFail($request->queue_session_id);
    $this->authorize('update', $session); // Using Policy
    
    $match = $this->queueMatchService->createMatch(
        $request->only(['court_id', 'teamA', 'teamB', 'queue_entry_ids']),
        $session
    );
    
    return $match->load([...]);
}
```

### After (QueueMatchService::createMatch)
```php
public function createMatch(array $data, QueueSession $session): QueueMatch
{
    // Business logic: Court availability
    if (!$this->isCourtAvailable($data['court_id'], $session)) {
        throw new CourtNotAvailableException('Court is not available');
    }
    
    // Business logic: Team assignment
    if (isset($data['teamA']) && isset($data['teamB'])) {
        return $this->createMatchWithTeams($data, $session);
    }
    
    return $this->createMatchWithEntryIds($data, $session);
}

private function createMatchWithTeams(array $data, QueueSession $session): QueueMatch
{
    // All team assignment logic here
    // Validate teams
    // Create match
    // Assign players
    // Update entry statuses
}
```

---

## Benefits of This Approach

### 1. **Testability**
- Services can be unit tested without HTTP layer
- Mock dependencies easily
- Test business logic in isolation

### 2. **Reusability**
- Services can be called from:
  - Controllers
  - Commands/Jobs
  - Other services
  - API endpoints
  - Console commands

### 3. **Maintainability**
- Clear separation of concerns
- Easier to locate business logic
- Changes isolated to specific services

### 4. **Scalability**
- Easy to add new features
- Can introduce repositories later if needed
- Can add caching layers in services

### 5. **Code Organization**
- Related business logic grouped together
- Easier onboarding for new developers
- Better code navigation

---

## Additional Considerations

### 1. **Exception Handling**
- Create custom exceptions for business logic errors:
  - `CourtNotAvailableException`
  - `InvalidTeamAssignmentException`
  - `MatchNotActiveException`
- Services throw exceptions, controllers catch and format HTTP responses

### 2. **Data Transfer Objects (DTOs)**
- Consider creating DTOs for complex service method parameters
- Improves type safety and documentation
- Example: `CreateMatchDTO`, `SuggestMatchDTO`

### 3. **Repository Pattern (Future)**
- If data access becomes more complex, consider repositories
- For now, services can use models directly (Laravel convention)
- Repositories would sit between services and models

### 4. **Service Interfaces**
- Consider creating interfaces for services
- Enables dependency injection and testing
- Example: `QueueMatchServiceInterface`

### 5. **Validation**
- Keep Laravel validation in controllers for HTTP input
- Add business rule validation in services
- Services can throw validation exceptions

---

## Migration Strategy

### Risk Mitigation
1. **Incremental Refactoring**: One service at a time
2. **Feature Parity**: Ensure same functionality after refactoring
3. **Testing**: Write tests for services before/during refactoring
4. **Backward Compatibility**: Keep existing API contracts

### Testing Approach
1. Write service tests first (TDD approach)
2. Ensure existing controller tests still pass
3. Add integration tests for critical flows
4. Test authorization policies separately

---

## Estimated Impact

### Code Reduction in Controllers
- **QueueMatchController**: ~150 lines → ~50 lines
- **QueueSessionController**: ~370 lines → ~150 lines
- **QueueEntryController**: ~40 lines → ~30 lines
- **CourtController**: ~120 lines → ~50 lines

### New Code in Services
- **QueueMatchService**: ~200 lines
- **QueueSessionService**: ~250 lines
- **MatchSuggestionService**: ~150 lines
- **QueueEntryService**: ~100 lines
- **CourtService**: ~150 lines
- **QueueSessionPolicy**: ~50 lines

### Net Result
- Better organization
- Improved testability
- Clearer separation of concerns
- Easier maintenance

---

## Next Steps (When Ready to Implement)

1. Review and approve this plan
2. Set up service directory structure
3. Create base Service class (if desired)
4. Start with Phase 1 (Policies)
5. Implement services incrementally
6. Update controllers as services are created
7. Add tests for each service
8. Remove old code after verification

---

## Questions to Consider

1. **Service Naming**: Use singular (QueueMatchService) or plural (QueueMatchesService)?
   - Recommendation: Singular (matches Laravel model convention)

2. **Service Location**: `app/Services/` or `app/Services/Queue/`?
   - Recommendation: Flat structure initially, can organize later

3. **Dependency Injection**: Constructor injection or method parameters?
   - Recommendation: Constructor injection for dependencies, method parameters for data

4. **Transaction Handling**: Where to handle database transactions?
   - Recommendation: In services, using `DB::transaction()`

5. **Response Formatting**: In controllers or services?
   - Recommendation: Controllers format HTTP responses, services return models/collections

---

## Conclusion

This refactoring plan provides a clear path to separate business logic from controllers using a service layer pattern. The incremental approach minimizes risk while providing immediate benefits in code organization and testability.

The service layer will make the codebase more maintainable, testable, and scalable as the application grows.
