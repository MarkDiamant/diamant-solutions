import crypto from 'node:crypto';
import {NextResponse} from 'next/server';
import adapterModule from '../../../../../lib/bms-original-subscription-adapters.cjs';
import recovery from '../../../../../lib/bms-original-subscription-recovery.cjs';
import core from '../../../../../lib/bms-original-subscription-upgrade.cjs';
export const runtime='nodejs';
const reply=(body:any,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=(x:any)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const ids={base:'price_1UIFEaKCFlu3cFvBVzR5uBNv',extra:'price_1UIX8VKCFlu3cFvBzdLNQgmy',ai:'price_1UIX8ZKCFlu3cFvBh8Ih992k'};
export async function POST(req:Request){
 const base=process.env.DS_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,stripeKey=process.env.STRIPE_SECRET_KEY;
 if(!base||!key||!stripeKey)return reply({error:'Server configuration missing'},503);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/, '');
 if(!token)return reply({error:'Internal administrator required'},403);
 const userResponse=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store'});
 if(!userResponse.ok)return reply({error:'Internal administrator required'},403);
 const user=await userResponse.json();
 const adapters=adapterModule.createAdapters({stripeKey,supabaseUrl:base,serviceKey:key});
 const membership=await adapters.rest('internal_admins?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id&limit=1');
 if(membership.length!==1)return reply({error:'Internal administrator required'},403);

 const taxRef=process.env.BMS_ORIGINAL_UPGRADE_TAX_EVIDENCE_REF;

 const taxPolicy={verified:true,basis:'no_vat_added',evidenceRef:taxRef};
 try{
  const body=await req.json();
  if(body.action!=='recover'&&body.action!=='revoke'&&process.env.BMS_ORIGINAL_UPGRADES_ENABLED!=='true')return reply({error:'Original subscription upgrades are not enabled'},503);
  if(body.action!=='recover'&&body.action!=='revoke'&&!taxRef)return reply({error:'Owner-approved tax treatment is not configured'},503);
  if(!['quote','record_consent','execute','revoke','recover'].includes(body.action))return reply({error:'Unknown action'},400);
  if(['execute','revoke','recover'].includes(body.action)){
   if(!uuid(body.authorityId))return reply({error:'Stored authority ID required'},400);
   const rows=await adapters.rest('bms_original_upgrade_authorities?id=eq.'+encodeURIComponent(body.authorityId)+'&limit=1');
   const a=rows[0];if(!a||(body.action==='execute'&&(a.revoked_at||new Date(a.expires_at).getTime()<=Date.now())))return reply({error:'Authority missing, expired or revoked'},409);
   if(body.action==='revoke'){await adapters.rest('bms_original_upgrade_authorities?id=eq.'+encodeURIComponent(a.id),'PATCH',{revoked_at:new Date().toISOString()});return reply({ok:true,revoked:true});}
   if(body.action==='recover'){
    const previous=await adapters.ledger.lookup(a.stripe_subscription_id);
    if(!previous||previous.binding.tenantId!==a.original_tenant_id)return reply({error:'Stored operation missing or mismatched'},409);
    const catalogue=await adapterModule.readCatalogue(adapters,ids);
    return reply(await recovery.recover({operation:previous,eventId:body.providerEventId,adapters,catalogue}));
   }
   const binding=await adapters.ledger.binding(a.original_tenant_id);
   if(binding.subscriptionId!==a.stripe_subscription_id||binding.customerId!==a.stripe_customer_id||a.tax_policy_ref!==taxRef)return reply({error:'Stored authority no longer matches account or tax policy'},409);
   const previous=await adapters.ledger.lookup(binding.subscriptionId);
   if(previous)return reply({operationId:previous.id,state:previous.state,result:previous.result,charged:false,requiresReconciliation:previous.state!=='paid_applied'});
   const catalogue=await adapterModule.readCatalogue(adapters,ids),nowSeconds=Math.floor(Date.now()/1000);
   const quote=await adapterModule.quote({binding,targetTotalUsers:a.target_total_users,taxPolicy,catalogue,adapters,nowSeconds});
   const consent={authorityId:a.id,ownerAuthorityRef:a.owner_authority_ref,clientConsentRef:a.client_consent_ref,verifiedByTrustedWorkflow:true,subscriptionId:a.stripe_subscription_id,customerId:a.stripe_customer_id,tenantId:a.original_tenant_id,targetTotalUsers:a.target_total_users,currency:a.currency,collectionMethod:a.collection_method,taxPolicyRef:a.tax_policy_ref,maxImmediateTotal:a.max_immediate_total,recurringTotal:a.recurring_total,expiresAt:Math.floor(new Date(a.expires_at).getTime()/1000)};
   return reply(await core.execute({quote,consent,binding,catalogue,nowSeconds,adapters}));
  }
  if(!uuid(body.tenantId)||!Number.isSafeInteger(body.targetTotalUsers)||body.targetTotalUsers<2||body.targetTotalUsers>50)return reply({error:'Original tenant and explicit target total users required'},400);
  const binding=await adapters.ledger.binding(body.tenantId),catalogue=await adapterModule.readCatalogue(adapters,ids),nowSeconds=Math.floor(Date.now()/1000);
  const quote=await adapterModule.quote({binding,targetTotalUsers:body.targetTotalUsers,taxPolicy,catalogue,adapters,nowSeconds});
  if(body.action==='quote')return reply({quote});
  // An authenticated internal reviewer records the evidence, not a customer's
  // boolean approval. Agents must independently inspect the original authority.
  const expiresAt=new Date(body.expiresAt).getTime();
  if(!Number.isSafeInteger(body.maxImmediateTotal)||body.maxImmediateTotal<quote.immediateTotal||body.recurringTotal!==quote.recurringTotal||!Number.isFinite(expiresAt)||expiresAt<=Date.now()||expiresAt>Date.now()+7*86400000)return reply({error:'Explicit consent cap, recurring amount and expiry required; maximum seven days'},400);
  if(![body.ownerAuthorityRef,body.clientConsentRef].every(x=>typeof x==='string'&&x.trim().length>=8)||typeof body.reviewedEvidenceText!=='string'||body.reviewedEvidenceText.trim().length<30||body.reviewedEvidenceText.length>12000)return reply({error:'Original owner/customer evidence references and reviewed approval text required'},400);
  const authorityId=crypto.randomUUID();
  await adapters.rest('bms_original_upgrade_authorities','POST',{id:authorityId,original_tenant_id:binding.tenantId,stripe_subscription_id:binding.subscriptionId,stripe_customer_id:binding.customerId,target_total_users:body.targetTotalUsers,max_immediate_total:body.maxImmediateTotal,recurring_total:body.recurringTotal,currency:'gbp',collection_method:'saved_default_payment_method',tax_policy_ref:taxRef,owner_authority_ref:body.ownerAuthorityRef,client_consent_ref:body.clientConsentRef,reviewed_evidence_text:body.reviewedEvidenceText,reviewed_by:user.id,expires_at:new Date(expiresAt).toISOString()});
  return reply({authorityId,quote,charged:false});
 }catch(error:any){console.error('original subscription upgrade failed',error?.message);return reply({error:'Upgrade stopped safely. Review quote, consent and operation state before retrying.'},409);}
}
