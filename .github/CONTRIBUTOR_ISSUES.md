# Contributor Issue Backlog

Use the following ready-to-create issues for contributors.  
Every issue includes the mandatory `apertre3.0` tag plus one difficulty tag: `easy`, `medium`, or `hard`.

---

## Easy

### 1) Improve empty state on Notifications page
- **Labels:** `easy`, `apertre3.0`
- **Description:**
  Add a friendly empty state UI on `pages/NotificationsPage.tsx` when there are no notifications.
- **Acceptance Criteria:**
  - Show icon + short message + call-to-action button.
  - Style is consistent with existing app theme.
  - No TypeScript errors.

### 2) Add loading spinner to Profile save action
- **Labels:** `easy`, `apertre3.0`
- **Description:**
  In `pages/ProfilePage.tsx`, show a loading indicator on the save button while profile updates are in progress.
- **Acceptance Criteria:**
  - Save button disabled while request is pending.
  - Spinner/text feedback appears.
  - Existing save logic still works.

### 3) Add inline helper text for OTP input
- **Labels:** `easy`, `apertre3.0`
- **Description:**
  Add helper text and error hint improvements around `components/common/OtpInput.tsx` usage in login flow.
- **Acceptance Criteria:**
  - Clear helper text for first-time users.
  - Validation hint appears for invalid OTP.
  - No visual regressions.

---

## Medium

### 4) Add transaction filtering by date range
- **Labels:** `medium`, `apertre3.0`
- **Description:**
  Extend `components/common/TransactionHistory.tsx` with date range filters.
- **Acceptance Criteria:**
  - Filter options: last 7 days, 30 days, custom range.
  - UI updates list without full page reload.
  - Handles empty filtered results.

### 5) Refactor drinks card rendering into reusable component
- **Labels:** `medium`, `apertre3.0`
- **Description:**
  Extract duplicated drinks item card UI from `pages/DrinksPage.tsx` / `pages/DrinksPageNew.tsx` into shared component.
- **Acceptance Criteria:**
  - Shared card component created and reused.
  - No behavior change in existing flows.
  - Component accepts props for name, image, price, and actions.

### 6) Add optimistic UI for chat messages
- **Labels:** `medium`, `apertre3.0`
- **Description:**
  Improve `pages/ChatPage.tsx` + chat context so sent messages appear instantly before server acknowledgment.
- **Acceptance Criteria:**
  - Pending state shown until confirmed.
  - Failed sends are clearly marked with retry option.
  - Order of messages remains stable.

---

## Hard

### 7) Implement role-based route guards (admin/member)
- **Labels:** `hard`, `apertre3.0`
- **Description:**
  Expand auth logic to support role-based access for selected routes using `components/auth/ProtectedRoute.tsx` and `contexts/AuthContext.tsx`.
- **Acceptance Criteria:**
  - Route-level permission checks for at least 2 roles.
  - Unauthorized users redirected with message.
  - Existing authenticated routes remain functional.

### 8) Add offline cache fallback for drinks catalog
- **Labels:** `hard`, `apertre3.0`
- **Description:**
  Build a cache strategy for drinks data in `services` + `utils/storage.ts` to support limited offline view.
- **Acceptance Criteria:**
  - Last successful drinks list is cached.
  - If network request fails, cached data is shown with stale warning.
  - Cache invalidation strategy documented in code comments.

### 9) Build audit log view for payment updates
- **Labels:** `hard`, `apertre3.0`
- **Description:**
  Add an admin-facing audit history page for payment status changes using payment context and transaction data.
- **Acceptance Criteria:**
  - New page listing timestamp, actor, old status, new status.
  - Pagination or virtualized list for large datasets.
  - Access restricted to admin role.

