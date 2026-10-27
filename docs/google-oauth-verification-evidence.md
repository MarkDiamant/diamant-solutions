# Google OAuth verification evidence and unresolved checks

Project: ds-business-software (Google Cloud project number 305628074304).

## Verified from BMS source
- OAuth authorization request is in `app/api/bms-live/[...path]/route.ts` and requests `openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose`.
- Google consent redirect URI is built from the application origin plus `/api/business-software/oauth/google/callback`.
- `gmail.send` is used for an authenticated tenant's explicitly requested quotation/invoice email via Gmail `users/me/messages/send`.
- `gmail.compose` is used for the corresponding Gmail draft via `users/me/drafts`.
- The same request constructs an email addressed to the job customer's email and attaches the quotation or invoice PDF. The API checks for a PDF attachment before creating the message.
- The callback exchanges the authorization code and persists an encrypted integration token against the authenticated tenant, subject to the application's integration access checks.

## Outstanding checks. Do not attest completion without evidence
1. Compare actual Cloud Console consent-screen scopes and publishing status with the source request. Cloud Console access is not available through the current connected tools.
2. Confirm the public privacy policy's exact disclosures for Google account identity, draft/send message contents, attachments, token storage, processors, retention and deletion. Source evidence alone is insufficient to assert production policies.
3. Verify the existing YouTube demonstration is public/unlisted, shows the expanded consent scopes and demonstrates both creating a draft and sending a message with the resulting Gmail-side state. The user has said the video is already recorded; its URL and content have not been verified here.
4. Determine Google's classification of the final requested scopes and whether a restricted-scope security assessment is required. Do not assume a CASA is waived.
5. Verify test-account access and reviewer navigation, then submit only accurate evidence through the verification request.

## Least privilege justification for review
- `openid email profile`: identify the connecting Google account and show it in the integration UI.
- `gmail.compose`: create user-directed drafts of BMS quotation/invoice emails with PDF attachments, leaving the final send decision to the user.
- `gmail.send`: send quotation/invoice emails on the explicit action of an authorised tenant user. The narrower `gmail.send` scope does not permit creation of a draft in Gmail, and `gmail.compose` is used for that separate draft feature.

This document is an internal technical evidence inventory, not a Google compliance certification. No Google correspondence should be sent based on it alone.
