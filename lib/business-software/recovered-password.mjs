const AUTH = 'https://iepqggrfenfqrqyzqyed.supabase.co/auth/v1';
const REST = 'https://iepqggrfenfqrqyzqyed.supabase.co/rest/v1';
const PUBLIC_KEY = 'sb_publishable_ivTCLFGFroexc-3IHe25bg_qhzg_GIy';
// Ordinary authenticated password recovery, not a first-password-only grant.
// Dependencies permit isolated tests without any provider or account mutation.
export async function updateRecoveredPassword(request, {tenantRecord, fetcher = fetch, provider = {auth:AUTH,rest:REST,publicKey:PUBLIC_KEY}}) {
 const result = (status, error) => ({status, body: error ? {error} : {ok: true, login: '/login'}});
 try {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || request.headers.get('origin') !== url.origin) return result(403, 'Open your recovery link in the same browser page.');
  const data = await request.json().catch(() => null);
  if (!data || typeof data.access_token !== 'string' || data.access_token.length < 20 || data.access_token.length > 8192 || /\s/.test(data.access_token) || typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 128) return result(400, 'Use a valid recovery session and a password of 12 to 128 characters.');
  // The actual routed URL selects the tenant. Never use forwarded-host input.
  const tenant = await tenantRecord(null, url.hostname.toLowerCase());
  if (!tenant?.id || tenant.status !== 'active') return result(403, 'This business is not available for sign-in.');
  const headers = {apikey: provider.publicKey, Authorization: 'Bearer ' + data.access_token, 'Content-Type': 'application/json'};
  const options = {headers, cache: 'no-store', redirect: 'error'};
  const current = await fetcher(provider.auth + '/user', options);
  const user = current.ok ? await current.json().catch(() => null) : null;
  if (!user?.id || !user.email) return result(401, 'Your recovery session has expired. Request a fresh link.');
  const membership = await fetcher(provider.rest + '/rpc/bms_recovery_membership', {...options, method: 'POST', body: JSON.stringify({p_tenant: tenant.id})});
  const member = membership.ok ? await membership.json().catch(() => null) : null;
  if (!member || typeof member !== 'object' || Array.isArray(member) || typeof member.id !== 'string' || !member.id || typeof member.role !== 'string' || !member.role || member.status !== 'active' || typeof member.email !== 'string' || member.email.trim().toLowerCase() !== String(user.email).trim().toLowerCase()) return result(403, 'This account is not authorised for this business.');
  // The provider authenticates and updates its own user. No service key, admin
  // endpoint, marker, invitation claim or caller-selected user ID is involved.
  const saved = await fetcher(provider.auth + '/user', {...options, method: 'PUT', body: JSON.stringify({password: data.password})});
  if (!saved.ok) return result(409, 'The password was not confirmed saved. Request a fresh recovery link if needed.');
  const updated = await saved.json().catch(() => null);
  if (updated?.id !== user.id) return result(503, 'The password result could not be confirmed. Try the normal sign-in page before requesting another link.');
  return result(200);
 } catch {
  // A failed response does not prove a provider write did not happen.
  return result(503, 'The password result could not be confirmed. Try the normal sign-in page before requesting another link.');
 }
}
