# Google OAuth privacy disclosure gap analysis (draft, not published)

Public page inspected on 27 October 2026: https://www.diamantsolutions.co.uk/privacy

The public policy covers general enquiries, customer documents, accounting retention, Google Workspace/Wix storage and deletion requests. It does not explicitly describe the BMS's per-tenant Google OAuth integration, requested Gmail compose/send scopes, how Gmail drafts and sent messages are handled, OAuth token retention/revocation, data transfers to Google or subprocessors, or Google API Services User Data Policy Limited Use commitments.

## Proposed supplement for legal and operational review (NOT APPROVED OR PUBLISHED)

**Connected Google account and Gmail features.** When an authorised business user connects a Google account to Diamant Solutions Business Management Software, the application requests Google account identity information (openid, email and profile) to identify the connected account, and the Gmail compose and send permissions to create Gmail drafts and send quotation, invoice and other business messages when the user selects the relevant action. Email recipient addresses, message contents and any attached business documents are processed only to carry out that user-directed action. We do not use Google user data for advertising, sale or unrelated profiling.

**Access and sharing.** Access to a connected account is restricted to authorised users of the relevant business tenant and the software components necessary to deliver the requested Gmail functionality. Gmail content and account tokens are not exposed to other BMS tenants. The application communicates with Google APIs and may use contracted hosting, database and security service providers to operate the integration, subject to applicable processing and confidentiality safeguards.

**Retention, revocation and deletion.** OAuth credentials are stored with technical protections while the integration remains connected. Users can request disconnection, deletion and information about retention through the published contact details. Operational deletion behaviour, backup retention periods and token revocation on disconnect MUST BE VERIFIED IN CODE AND INFRASTRUCTURE BEFORE THIS TEXT IS PUBLISHED.

**Google API Limited Use.** Any access to, use, storage or transfer of information received from Google APIs must comply with the Google API Services User Data Policy, including Limited Use requirements. A compliance statement should be published only after the implementation and processors are verified.

## Blocking evidence checks

1. Verify the BMS integration-disconnect endpoint actually revokes Google refresh tokens and removes stored credentials, and verify backup retention.
2. Verify the exact data subprocessors and encryption-at-rest/secret handling implementation.
3. Confirm the policy is linked on the OAuth consent screen for project 305628074304.
4. Obtain legal/owner approval before changing the public Wix privacy page or representing these claims to Google.
5. Confirm Google Cloud Console configured scopes match source and the already-submitted video.

No changes to the public policy were made by this document.
