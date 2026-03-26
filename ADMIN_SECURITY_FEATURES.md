# Admin Security Features

This document summarizes the admin-facing security and moderation features added for:

- Partner request approval
- Blocked user management

It explains both the implementation changes and the reason behind each change.

## 1. Partner Requests

### Goal

The goal of this feature is to stop users from becoming partners immediately just by choosing `Register as a Partner = Yes` during signup.

Instead, users now:

1. Register normally
2. Submit a partner request
3. Wait for admin approval
4. Become a real `partner` only after admin approval

This makes the partner flow safer and closer to a real moderation workflow.

### Why this was needed

Before this change:

- A user could directly register with role `partner`
- There was no admin approval checkpoint
- Any user could potentially gain partner access without review

That was risky because partners can manage theatres and operational data.

### Backend changes

#### User model updates

File: `server/models/userModel.js`

Added:

- `partnerRequestStatus`
- `partnerRequestSubmittedAt`

Purpose:

- Track whether a user has requested partner access
- Track whether the request is pending, approved, rejected, or blocked
- Keep `role` separate from the request state

#### Registration flow

File: `server/controller/user.js`

Changed behavior:

- If the user selects partner during registration, they are still created with role `user`
- Their `partnerRequestStatus` is set to `pending`
- The request timestamp is stored

Purpose:

- Prevent direct self-promotion to `partner`
- Force partner access through admin review

#### Admin partner APIs

File: `server/controller/user.js`
File: `server/routes/userRoute.js`

Added endpoints:

- Fetch partner requests
- Update partner request status

Purpose:

- Let admin review all partner applicants
- Let admin approve or block partner access

### Frontend changes

#### Partner request confirmation page

File: `client/src/pages/PartnerRequestSent.jsx`

Purpose:

- Show a confirmation after partner registration
- Tell the user the request has been sent to admin
- Provide a button to go to login

#### Pending partner page

File: `client/src/pages/PartnerApprovalPending.jsx`

Purpose:

- If a partner applicant logs in before approval, show a dedicated waiting screen
- Avoid silently failing or sending them into the normal user flow

#### Admin dashboard tab

File: `client/src/pages/Admin/index.jsx`
File: `client/src/pages/Admin/PartnerRequestsTable.jsx`

Added:

- `Partner Requests` tab in admin dashboard
- Table for reviewing requests
- Admin action to approve or block

Purpose:

- Give admin a single place to manage partner onboarding
- Keep this workflow consistent with the theatre approval model

### Login flow behavior

File: `client/src/pages/Login/index.jsx`
File: `client/src/api/users.js`

Changed behavior:

- If the account is still a normal user with `partnerRequestStatus` like `pending`, `rejected`, or `blocked`, the app redirects to the pending page instead of letting the user proceed as if fully approved

Purpose:

- Make the approval state visible to the applicant
- Avoid confusion about whether partner access has been granted

## 2. Blocked Users

### Goal

The goal of this feature is to give admin a way to block suspicious or unsafe accounts from:

- Logging in
- Booking shows

This is a moderation and security control.

### Why this was needed

Before this change:

- There was no way for admin to disable a compromised or abusive account
- A user could continue logging in and making bookings even if the admin wanted to stop that account

This made it harder to respond to fraud, abuse, or security incidents.

### Backend changes

#### User model updates

File: `server/models/userModel.js`

Added:

- `isBlocked`
- `blockReason`
- `blockedAt`

Purpose:

- Store whether an account is blocked
- Store why the account was blocked
- Store when the block happened

#### Blocked user APIs

File: `server/controller/user.js`
File: `server/routes/userRoute.js`

Added endpoints:

- Search users for blocking
- Fetch blocked users
- Block one or more users
- Unblock a user

Purpose:

- Allow admin moderation from the dashboard
- Support search-driven blocking workflow
- Support reversing a block cleanly

#### Blocking rules

File: `server/controller/user.js`

Rules implemented:

- Admin can only block users with role `user`
- Admin cannot block admins
- Multiple users can be blocked in one action

Purpose:

- Keep moderation safer
- Prevent accidental blocking of privileged roles
- Support faster admin workflows when several accounts need action

#### Login enforcement

File: `server/controller/user.js`

Changed behavior:

- If a blocked user tries to log in, login is denied
- The response includes blocked-account information for the frontend

Purpose:

- Ensure blocked users cannot access the app

#### Booking enforcement

File: `server/controller/booking.js`
File: `server/routes/bookingRoute.js`

Changed behavior:

- Blocked users cannot create checkout sessions
- Blocked users cannot confirm checkout sessions
- Blocked users cannot book through the legacy booking route
- The legacy booking route is now protected by auth middleware

Purpose:

- Prevent blocked users from making bookings
- Close gaps where an older route might bypass the restriction

### Frontend changes

#### Admin dashboard tab

File: `client/src/pages/Admin/index.jsx`
File: `client/src/pages/Admin/BlockedUsersTable.jsx`

Added:

- `Blocked Users` tab
- `+` button in the admin tab header
- Table showing blocked users, reasons, and block date
- Unblock action

Purpose:

- Give admin a dedicated moderation view

#### Block user modal

File: `client/src/pages/Admin/BlockUserModal.jsx`

Added:

- Search by user name or email
- Debounced search
- Scrollable dropdown of matching users
- Multi-select behavior
- Persistent selected-user list above the reason field
- Security reason input
- `Block User` and `Cancel` buttons

Purpose:

- Make admin blocking usable and efficient
- Prevent losing selected users when search text changes
- Support blocking several users in one moderation action

#### Blocked login screen

File: `client/src/pages/BlockedUserAccessDenied.jsx`
File: `client/src/pages/Login/index.jsx`
File: `client/src/api/users.js`

Changed behavior:

- Blocked login attempts are redirected to a dedicated `Access Denied` screen
- The login API wrapper now preserves `data.isBlocked` from backend errors

Purpose:

- Show a clear blocked-account state instead of only a toast error
- Make blocked login handling consistent and visible

## 3. UX and Security Design Decisions

### Separate request state from role

Why:

- A request to become a partner is not the same thing as actually being a partner
- Keeping these separate prevents privilege escalation

### Server-side enforcement, not just frontend checks

Why:

- Frontend checks improve UX
- Backend checks provide real security
- Users should not be able to bypass restrictions by calling APIs directly

### Admin-only moderation APIs

Why:

- Partner approval and user blocking are privileged actions
- Only admins should be allowed to perform them

### Dedicated status pages

Why:

- Users should understand why they cannot proceed
- Clear status pages reduce confusion better than generic error messages

## 4. Files Touched

### Partner Requests

- `server/models/userModel.js`
- `server/controller/user.js`
- `server/routes/userRoute.js`
- `client/src/api/users.js`
- `client/src/pages/Register/index.jsx`
- `client/src/pages/Login/index.jsx`
- `client/src/pages/Admin/index.jsx`
- `client/src/pages/Admin/PartnerRequestsTable.jsx`
- `client/src/pages/PartnerRequestSent.jsx`
- `client/src/pages/PartnerApprovalPending.jsx`
- `client/src/App.jsx`

### Blocked Users

- `server/models/userModel.js`
- `server/controller/user.js`
- `server/routes/userRoute.js`
- `server/controller/booking.js`
- `server/routes/bookingRoute.js`
- `client/src/api/users.js`
- `client/src/pages/Admin/index.jsx`
- `client/src/pages/Admin/BlockedUsersTable.jsx`
- `client/src/pages/Admin/BlockUserModal.jsx`
- `client/src/pages/Login/index.jsx`
- `client/src/pages/BlockedUserAccessDenied.jsx`
- `client/src/App.css`
- `client/src/App.jsx`

## 5. Summary

These features add two important admin controls:

1. Controlled partner onboarding through approval
2. Security moderation through account blocking

Together they improve:

- role safety
- admin control
- abuse prevention
- user-state clarity
- backend enforcement

They also make the project feel more production-like, because sensitive permissions are no longer granted automatically and suspicious users can be stopped centrally.
