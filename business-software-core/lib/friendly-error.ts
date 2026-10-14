/** Keep diagnostic detail in logs; never expose implementation errors to customers. */
export function friendlyError(value:unknown,fallback="Something went wrong. Please try again."):string {
 const raw=String(value instanceof Error?value.message:value??"").trim();
 if(!raw)return fallback;
 if(/removeChild|not a child of this node|chunkloaderror|loading chunk|failed to fetch dynamically|hydration|networkerror|failed to fetch|timeout|gateway|service unavailable|internal server error/i.test(raw))return "There was a temporary problem. Please refresh the page and try again. If it continues, contact support.";
 if(/syntaxerror|typeerror|referenceerror|stack trace|sqlstate|postgres|supabase|prisma|unexpected token|\\bat\\s+\\S+.*:\\d+|\\{.*\\}|<html|<!doctype/i.test(raw)||raw.length>220)return fallback+" If it continues, contact support.";
 return raw;
}
