# Auth Background And Ticket Download Changes

## Why these changes were made

Two user-facing areas were improved:

1. Auth pages looked plain and inconsistent

- The login, register, forgot-password, and reset-password pages did not feel connected to the movie-booking theme.
- They needed a stronger visual identity and better consistency across all auth screens.

2. Users needed a downloadable ticket from My Profile

- Users could scan the ticket QR from the profile page, but there was no way to save a ticket copy locally.
- A downloadable ticket helps users keep a backup and makes the booking flow feel more complete.

## What changed for the auth background

### 1. Added a shared auth background component

File:
- `client/src/Components/AuthPosterBackground.jsx`

What changed:

- Added a reusable poster-wall background component.
- The component renders an animated movie-catalog style background using external movie poster images.
- The background includes the shared overlay structure used across auth screens.

Why:

- The auth background should be defined once and reused instead of duplicating markup in multiple pages.
- A shared component keeps the login/register/forgot/reset pages visually consistent.

### 2. Updated the login page to use the new poster-wall background

File:
- `client/src/pages/Login/index.jsx`

What changed:

- Replaced the older login-only background markup with the shared `AuthPosterBackground` component.
- Kept the login form layout on top of the themed background.

Why:

- The login page was the first auth page redesigned and now acts as the base for the shared auth visual system.

### 3. Extended the same background to register, forgot-password, and reset-password

Files:
- `client/src/pages/Register/index.jsx`
- `client/src/pages/Forget.jsx`
- `client/src/pages/Reset.jsx`

What changed:

- Added `AuthPosterBackground` behind each of these auth pages.
- Kept each form’s own content while reusing the same background experience.

Why:

- All auth pages should feel like part of the same flow, not separate screens with different visual styles.

### 4. Updated auth styling to work over a themed background

File:
- `client/src/App.css`

What changed:

- Added and refined styles for:
  - `.auth-shell`
  - `.login-cinema-bg`
  - `.login-poster-catalogue`
  - `.login-poster-column`
  - `.login-poster-card`
  - `.login-cinema-overlay`
  - `.login-cinema-vignette`
- Made auth cards transparent instead of solid white.
- Improved text contrast for titles, labels, helper text, and auth links.
- Adjusted mobile/responsive behavior for the poster background.

Why:

- A busy poster background can make form content hard to read.
- Transparent auth cards and higher-contrast text preserve the cinematic look without sacrificing usability.

## What changed for the ticket download feature

### 1. Added a download action in My Bookings

File:
- `client/src/pages/User/Bookings.jsx`

What changed:

- Added a `Download Ticket` button below the QR block inside the booking card.
- The button is available per booking in the My Profile / My Bookings page.

Why:

- Users should be able to keep a local copy of their ticket instead of relying only on the in-app QR view.

### 2. Added ticket-download button styling

File:
- `client/src/App.css`

What changed:

- Added styling for the download-ticket action area and button.
- Adjusted spacing around the QR area so the action reads clearly in the booking card UI.

Why:

- The download action should feel like a deliberate part of the booking card, not an afterthought.

### 3. Added client-side ticket export generation

File:
- `client/src/pages/User/Bookings.jsx`

What changed:

- Added logic to generate a downloadable ticket from booking data.
- The implementation now renders a custom ticket canvas and converts it into a downloadable PDF.
- The ticket includes:
  - movie title
  - theatre name
  - booking date and time
  - selected seats
  - amount
  - QR block for entry

Why:

- A fully client-side export avoids adding server-side PDF generation complexity.
- It also makes the feature immediately available from the profile page without another API dependency.

### 4. Iteratively refined the ticket layout

File:
- `client/src/pages/User/Bookings.jsx`

What changed:

- The ticket export layout was refined multiple times to improve usability:
  - switched from a basic export to a more designed ticket layout
  - changed from horizontal to vertical layout
  - removed unnecessary fields like booking ID from the final ticket
  - removed unwanted decorative sections
  - tightened empty space and reduced page height
  - repositioned QR, amount, and helper text for a cleaner composition
  - removed poster usage from the final ticket layout
  - narrowed and trimmed the final exported ticket to reduce scroll-like viewing behavior

Why:

- The first working export was functional but visually weak.
- The goal shifted from “just export something” to “export a compact, ticket-like PDF users can actually keep and use”.

## Final result

After these changes:

- all auth pages share the same movie-themed animated poster background
- auth forms are more readable over that background
- the profile bookings page now allows users to download a ticket
- the downloaded ticket is generated client-side as a PDF and uses a custom designed layout instead of plain text output

## Main files touched

- `client/src/Components/AuthPosterBackground.jsx`
- `client/src/pages/Login/index.jsx`
- `client/src/pages/Register/index.jsx`
- `client/src/pages/Forget.jsx`
- `client/src/pages/Reset.jsx`
- `client/src/pages/User/Bookings.jsx`
- `client/src/App.css`
