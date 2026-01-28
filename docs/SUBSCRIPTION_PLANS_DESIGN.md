# Subscription Plans Design Document

## Overview
This document outlines the design for implementing subscription-based plans (Start, Professional, Enterprise) that limit the number of courts an owner can create. This is a **design-only document** - no implementation is required at this time.

---

## Business Requirements

### Current State
- Owners can create unlimited courts
- No subscription or plan system exists
- Current target client has 4 courts

### Target State
- Owners are assigned to subscription plans (Start, Professional, Enterprise)
- Each plan has a maximum court limit
- System enforces court creation limits based on subscription plan
- Owners can upgrade/downgrade plans (future feature)

---

## Subscription Plan Tiers

### Plan Definitions

| Plan | Max Courts | Price (Future) | Features |
|------|------------|---------------|----------|
| **Start** | 2 courts | $X/month | Basic court management |
| **Professional** | 10 courts | $Y/month | Advanced features + analytics |
| **Enterprise** | Unlimited | $Z/month | All features + priority support |

**Note**: For your current client with 4 courts, they would need **Professional** plan.

---

## Database Schema Design

### 1. Subscription Plans Table
```sql
CREATE TABLE subscription_plans (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'start', 'professional', 'enterprise'
    display_name VARCHAR(100) NOT NULL, -- 'Start', 'Professional', 'Enterprise'
    max_courts INT NOT NULL, -- NULL means unlimited
    price_monthly DECIMAL(10,2) NULL, -- NULL for free tier
    price_yearly DECIMAL(10,2) NULL,
    features JSON NULL, -- Store plan features as JSON
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Sample Data**:
```sql
INSERT INTO subscription_plans (name, display_name, max_courts, price_monthly) VALUES
('start', 'Start', 2, 0.00),
('professional', 'Professional', 10, 29.99),
('enterprise', 'Enterprise', NULL, 99.99); -- NULL = unlimited
```

### 2. User Subscriptions Table
```sql
CREATE TABLE user_subscriptions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    subscription_plan_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trial'
    started_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NULL, -- NULL for lifetime/unlimited
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id),
    
    INDEX idx_user_status (user_id, status),
    INDEX idx_expires_at (expires_at)
);
```

**Note**: For now, we can set `expires_at` to NULL (lifetime) or far future date.

### 3. Add Subscription Fields to Users Table (Alternative Approach)
Instead of a separate subscriptions table, we could add:
```sql
ALTER TABLE users ADD COLUMN subscription_plan_id BIGINT NULL;
ALTER TABLE users ADD FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id);
```

**Recommendation**: Use `user_subscriptions` table for better history tracking and future billing features.

---

## Backend Implementation Design

### 1. Models

#### SubscriptionPlan Model
```php
// backend/app/Models/SubscriptionPlan.php
class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name', 'display_name', 'max_courts', 
        'price_monthly', 'price_yearly', 'features', 'is_active'
    ];
    
    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
        'max_courts' => 'integer',
    ];
    
    // Helper methods
    public function isUnlimited(): bool
    {
        return $this->max_courts === null;
    }
    
    public function allowsCourts(int $count): bool
    {
        if ($this->isUnlimited()) {
            return true;
        }
        return $count <= $this->max_courts;
    }
}
```

#### UserSubscription Model
```php
// backend/app/Models/UserSubscription.php
class UserSubscription extends Model
{
    protected $fillable = [
        'user_id', 'subscription_plan_id', 'status',
        'started_at', 'expires_at', 'cancelled_at'
    ];
    
    protected $casts = [
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }
    
    public function isActive(): bool
    {
        return $this->status === 'active' 
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
```

#### Update User Model
```php
// Add to User model
public function subscription()
{
    return $this->hasOne(UserSubscription::class)
        ->where('status', 'active')
        ->latest();
}

public function activeSubscription()
{
    return $this->subscription()
        ->where(function($query) {
            $query->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
        });
}

public function getCurrentPlan(): ?SubscriptionPlan
{
    $subscription = $this->activeSubscription()->first();
    return $subscription ? $subscription->plan : null;
}

public function canCreateCourt(): bool
{
    $plan = $this->getCurrentPlan();
    if (!$plan) {
        return false; // No plan = no courts allowed
    }
    
    $currentCourtCount = $this->courts()->count();
    return $plan->allowsCourts($currentCourtCount + 1);
}

public function getRemainingCourtSlots(): ?int
{
    $plan = $this->getCurrentPlan();
    if (!$plan) {
        return 0;
    }
    
    if ($plan->isUnlimited()) {
        return null; // null = unlimited
    }
    
    $currentCount = $this->courts()->count();
    return max(0, $plan->max_courts - $currentCount);
}
```

### 2. Court Creation Validation

#### Update CourtController
```php
// backend/app/Http/Controllers/CourtController.php

public function store(Request $request)
{
    // Check subscription limit
    $user = $request->user();
    
    if (!$user->canCreateCourt()) {
        $plan = $user->getCurrentPlan();
        $currentCount = $user->courts()->count();
        
        return response()->json([
            'message' => 'Court limit reached',
            'error' => 'subscription_limit_exceeded',
            'current_courts' => $currentCount,
            'max_courts' => $plan?->max_courts ?? 0,
            'plan_name' => $plan?->display_name ?? 'No Plan',
        ], 403);
    }
    
    // Existing validation
    $request->validate([
        'name' => 'required|string|max:50',
        'hourly_rate' => 'nullable|numeric|min:0',
        'reservation_fee_percentage' => 'nullable|numeric|min:0|max:100',
    ]);
    
    // Create court
    return Court::create([
        'owner_id' => $user->id,
        'name' => $request->name,
        'hourly_rate' => $request->hourly_rate,
        'reservation_fee_percentage' => $request->reservation_fee_percentage ?? 0,
    ]);
}
```

### 3. Subscription Service (Optional)

```php
// backend/app/Services/SubscriptionService.php
class SubscriptionService
{
    public function assignPlanToUser(User $user, string $planName): UserSubscription
    {
        $plan = SubscriptionPlan::where('name', $planName)->firstOrFail();
        
        // Cancel existing active subscription
        $user->subscription()->update(['status' => 'cancelled']);
        
        // Create new subscription
        return UserSubscription::create([
            'user_id' => $user->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'started_at' => now(),
            'expires_at' => null, // Lifetime for now
        ]);
    }
    
    public function checkCourtLimit(User $user): array
    {
        $plan = $user->getCurrentPlan();
        $currentCount = $user->courts()->count();
        
        if (!$plan) {
            return [
                'can_create' => false,
                'reason' => 'no_subscription',
                'current' => $currentCount,
                'max' => 0,
            ];
        }
        
        $canCreate = $plan->allowsCourts($currentCount + 1);
        $remaining = $plan->isUnlimited() 
            ? null 
            : max(0, $plan->max_courts - $currentCount);
        
        return [
            'can_create' => $canCreate,
            'current' => $currentCount,
            'max' => $plan->max_courts,
            'remaining' => $remaining,
            'plan' => $plan->display_name,
        ];
    }
}
```

### 4. API Endpoints (Future)

```php
// backend/routes/api.php

// Get current subscription info
Route::middleware('auth:sanctum')->get('/subscription/status', function (Request $request) {
    $user = $request->user();
    $subscription = $user->activeSubscription()->with('plan')->first();
    
    return response()->json([
        'subscription' => $subscription,
        'current_courts' => $user->courts()->count(),
        'max_courts' => $subscription?->plan->max_courts,
        'remaining_slots' => $user->getRemainingCourtSlots(),
    ]);
});

// Get available plans (for upgrade UI)
Route::get('/subscription/plans', function () {
    return SubscriptionPlan::where('is_active', true)->get();
});
```

---

## Frontend Implementation Design

### 1. Court Limit Display

#### Update OwnerCourts.jsx
```jsx
// Show subscription status and court limit
const [subscriptionInfo, setSubscriptionInfo] = useState(null);

useEffect(() => {
  // Fetch subscription status
  api.get('/subscription/status').then(res => {
    setSubscriptionInfo(res.data);
  });
}, []);

// Display limit warning
{subscriptionInfo && (
  <div style={{
    padding: '1rem',
    backgroundColor: subscriptionInfo.remaining_slots === 0 
      ? '#fee2e2' 
      : '#dbeafe',
    borderRadius: '0.5rem',
    marginBottom: '1rem'
  }}>
    <strong>Subscription:</strong> {subscriptionInfo.plan?.display_name || 'No Plan'}
    <br />
    Courts: {subscriptionInfo.current_courts} / {
      subscriptionInfo.max_courts === null 
        ? 'Unlimited' 
        : subscriptionInfo.max_courts
    }
    {subscriptionInfo.remaining_slots !== null && (
      <> ({subscriptionInfo.remaining_slots} remaining)</>
    )}
  </div>
)}
```

### 2. Court Creation Error Handling

```jsx
// In OwnerCourts.jsx - handle court creation
const handleCreateCourt = async (courtData) => {
  try {
    await api.post('/courts', courtData);
    // Success
  } catch (err) {
    if (err.response?.data?.error === 'subscription_limit_exceeded') {
      const data = err.response.data;
      alert(
        `Court limit reached!\n\n` +
        `Current Plan: ${data.plan_name}\n` +
        `Courts Used: ${data.current_courts} / ${data.max_courts}\n\n` +
        `Please upgrade your plan to create more courts.`
      );
    } else {
      // Other errors
      alert(err.response?.data?.message || 'Failed to create court');
    }
  }
};
```

### 3. Disable Create Button When Limit Reached

```jsx
// Disable button if limit reached
<button
  onClick={handleCreateCourt}
  disabled={subscriptionInfo?.remaining_slots === 0}
  style={{
    opacity: subscriptionInfo?.remaining_slots === 0 ? 0.5 : 1,
    cursor: subscriptionInfo?.remaining_slots === 0 ? 'not-allowed' : 'pointer'
  }}
>
  Create Court
  {subscriptionInfo?.remaining_slots === 0 && ' (Limit Reached)'}
</button>
```

---

## Migration Strategy

### Phase 1: Database Setup (No Breaking Changes)
1. Create `subscription_plans` table
2. Seed with default plans (Start, Professional, Enterprise)
3. Create `user_subscriptions` table
4. Add helper methods to User model (non-breaking)

### Phase 2: Assign Default Plans
1. Create migration to assign "Professional" plan to all existing owners
2. Run migration: `php artisan migrate`
3. Verify all owners have subscriptions

### Phase 3: Enable Enforcement
1. Update `CourtController::store()` to check limits
2. Add frontend display of subscription status
3. Test with existing owners

### Phase 4: UI Enhancements (Future)
1. Add subscription management page
2. Add upgrade/downgrade flow
3. Add billing integration

---

## Default Plan Assignment

### Migration for Existing Owners
```php
// backend/database/migrations/XXXX_XX_XX_assign_default_subscriptions.php

public function up()
{
    // Get Professional plan (or Start if Professional doesn't exist)
    $defaultPlan = SubscriptionPlan::where('name', 'professional')
        ->orWhere('name', 'start')
        ->first();
    
    if (!$defaultPlan) {
        throw new \Exception('No default subscription plan found');
    }
    
    // Assign to all existing owners
    $owners = User::where('role', 'owner')->get();
    
    foreach ($owners as $owner) {
        UserSubscription::create([
            'user_id' => $owner->id,
            'subscription_plan_id' => $defaultPlan->id,
            'status' => 'active',
            'started_at' => now(),
            'expires_at' => null, // Lifetime
        ]);
    }
}
```

---

## Testing Considerations

### Test Cases
1. **Court Creation Limits**:
   - Start plan: Can create 2 courts, fails on 3rd
   - Professional plan: Can create 10 courts, fails on 11th
   - Enterprise plan: Can create unlimited courts

2. **Edge Cases**:
   - Owner with no subscription cannot create courts
   - Owner with expired subscription cannot create courts
   - Court deletion frees up slots for new courts

3. **API Responses**:
   - 403 error with clear message when limit reached
   - Include current count, max count, plan name in error

---

## Future Enhancements

1. **Plan Upgrades/Downgrades**:
   - Allow owners to upgrade/downgrade plans
   - Handle prorated billing
   - Grace period for downgrades (keep existing courts)

2. **Billing Integration**:
   - Stripe/PayPal integration
   - Recurring payments
   - Invoice generation

3. **Trial Periods**:
   - Free trial for new owners
   - Trial expiration handling

4. **Additional Plan Features**:
   - Analytics access (Professional+)
   - Priority support (Enterprise)
   - Custom branding (Enterprise)

---

## Summary

### For Your Current Client (4 Courts)
- **Recommended Plan**: Professional (10 courts max)
- **Implementation**: Assign Professional plan to the owner account
- **No Breaking Changes**: Existing functionality continues to work

### Implementation Checklist (When Ready)
- [ ] Create database migrations
- [ ] Create models (SubscriptionPlan, UserSubscription)
- [ ] Update User model with helper methods
- [ ] Update CourtController to enforce limits
- [ ] Create default plan assignment migration
- [ ] Add frontend subscription status display
- [ ] Add error handling for limit exceeded
- [ ] Test with existing owners
- [ ] Document API endpoints

---

## Questions to Consider

1. **Default Plan**: What plan should new owners get by default?
   - Recommendation: Start (2 courts) - encourages upgrades

2. **Existing Owners**: Should all existing owners get Professional automatically?
   - Recommendation: Yes, to avoid breaking existing functionality

3. **Court Deletion**: Should deleting a court immediately free up a slot?
   - Recommendation: Yes, immediate slot availability

4. **Unlimited Plans**: How to handle NULL max_courts in UI?
   - Recommendation: Display "Unlimited" or "∞" symbol

5. **Plan Changes**: Should owners be able to change plans themselves?
   - Recommendation: Initially admin-only, add self-service later

---

**Status**: Design Complete - Ready for Implementation When Needed
