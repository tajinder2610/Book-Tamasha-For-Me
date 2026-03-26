# OAuth 2.0 Notes

## What OAuth 2.0 Is

OAuth 2.0 is an authorization framework that allows an application to obtain limited access to a user's account on another service without handling that user's password.

In a Google login flow:
- the user authenticates with Google
- Google returns an authorization code
- the backend exchanges that code for tokens
- the backend uses a token to fetch the user's identity or profile
- the application creates its own local login state

OAuth 2.0 itself is about authorization. When it is used for login, it is commonly paired with OpenID Connect (OIDC), which adds identity information.

## Main Parts

- User: the person logging in
- Client: your application
- Authorization Server: the service handling login and consent, such as Google
- Resource Server: the API serving protected data
- Authorization Code: a short-lived code returned after consent
- Access Token: a token used to call protected APIs
- Refresh Token: a token used to get a new access token
- ID Token: identity information returned in OpenID Connect flows

## What `redirect_uri` Means

The `redirect_uri` is the callback URL where the authorization server sends the user after login and consent.

Example:

`http://localhost:5000/auth/google/callback`

The authorization server sends the authorization code to this URL.

Important details:
- the URI must be registered in the provider's console
- the same URI must be used again during token exchange
- mismatches usually cause the flow to fail

## What Google's Token Endpoint Is

Google's token endpoint is the backend endpoint where the authorization code is exchanged for tokens.

Endpoint:

`https://oauth2.googleapis.com/token`

The backend sends a `POST` request with values like:
- `client_id`
- `client_secret`
- `code`
- `redirect_uri`
- `grant_type=authorization_code`

Google responds with values such as:
- `access_token`
- `id_token`
- `expires_in`
- `refresh_token` in some cases

## What "Exchange the Code for Tokens" Means

After the user logs in, the provider does not send the password to your app.

Instead:
1. the user is redirected back with an authorization code
2. the backend sends that code to the token endpoint
3. the provider returns tokens
4. the backend uses the token to identify the user or fetch profile data
5. the backend creates or finds the user in the database
6. the application creates its own session or JWT

This means the provider verifies the user first, and then your application creates its own authenticated session for internal use.

## Why the Authorization Server Does Not Return All User Data Directly

OAuth separates identity/consent from protected resource access.

Authorization server responsibilities:
- authenticate the user
- ask for consent
- issue codes and tokens

Resource server responsibilities:
- store protected data
- return data only when a valid access token is presented

Benefits of this separation:
- access is controlled by scoped tokens
- tokens can expire or be revoked
- login and API access stay separate
- the same token can be used across different APIs

In OpenID Connect, some basic identity information may be present in the `id_token`, but API/resource access still depends on the `access_token`.

## OAuth 2.0 Authorization Code Flow

### Short Flow

User -> Frontend -> Authorization Server -> Backend Callback -> Token Endpoint -> User Info API -> Database -> Local Session/JWT

### Detailed Flow

```text
[User]
   |
   | 1. Clicks "Continue with Google"
   v
[React Frontend]
   |
   | 2. Redirects the user to Google's authorization page
   v
[Google Authorization Server]
   |
   | 3. User logs in and grants consent
   v
[Google Authorization Server]
   |
   | 4. Redirects back to the callback URL
   |    with an authorization code
   v
[Node Backend: /auth/google/callback]
   |
   | 5. Sends the code to Google's token endpoint
   v
[Google Token Endpoint]
   |
   | 6. Returns tokens
   v
[Node Backend]
   |
   | 7. Uses a token to fetch the user's profile
   v
[Google User Info API]
   |
   | 8. Returns user data
   v
[Node Backend]
   |
   | 9. Finds or creates the user in the database
   v
[Database]
   |
   | 10. Application creates its own JWT or session
   v
[Node Backend]
   |
   | 11. Redirects the user back to the frontend
   v
[React Frontend]
   |
   | 12. User is logged into the application
   v
[Protected Pages]
```

## React + Node Implementation

### Basic Steps

1. Create OAuth credentials in Google Cloud Console
2. configure the authorized redirect URI
3. add a login button in the frontend
4. redirect the user to a backend route such as `/auth/google`
5. backend redirects the user to Google's authorization page
6. Google sends the user back to `/auth/google/callback` with a code
7. backend exchanges the code for tokens
8. backend fetches the user's profile
9. backend creates or finds the user in the database
10. backend creates a local JWT or session
11. backend redirects the user back to the frontend

### Common Backend Routes

- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /me`
- `POST /logout`

### Common Environment Variables

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
```

### What the Database Usually Stores

- `name`
- `email`
- `googleId`
- `avatar`
- `authProvider`

### What the Application Uses After Google Login

Even after successful Google OAuth, the application should usually use its own:
- JWT
- or server-side session cookie

This local token or session is what the rest of the app uses to protect routes and identify the logged-in user.

## Security Notes

- keep `client_secret` on the backend only
- use HTTPS in production
- validate the `state` parameter to reduce CSRF risk
- use PKCE for public clients such as SPAs and mobile apps
- keep access tokens short-lived
- store refresh tokens securely
- validate ID tokens when using OpenID Connect
- ensure callback URLs are exact and restricted

## Useful Distinctions

### OAuth vs OpenID Connect

- OAuth 2.0 = authorization
- OpenID Connect = authentication layer on top of OAuth 2.0

### Access Token vs Refresh Token

- access token = used to call APIs
- refresh token = used to obtain a new access token

### Provider Token vs App Session

- provider token = proves access to provider APIs
- app session or JWT = proves the user is logged into your application

## One-Line Summary

OAuth 2.0 lets a user authenticate with a provider like Google, allows the backend to exchange the returned authorization code for tokens, and then lets the application create its own local authenticated session.
