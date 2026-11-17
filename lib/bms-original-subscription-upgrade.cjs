'use strict';
// Core for original BMS subscriptions. No network, database or customer effects
// occur unless an authorised server supplies the adapters to execute().
const crypto=require('node:crypto');
const id=x=>typeof x==='string'?x:x?.id;
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const stable=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const hash=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
function requireThat(ok,message){if(!ok)throw Error(message)}
function inspect(subscription,binding,catalogue){
 requireThat(subscription.id===binding.subscriptionId&&id(subscription.customer)===binding.customerId,'Subscription/customer mismatch');
 requireThat(binding.tenantId&&binding.orderId,'Verified paid-order tenant binding required');
 requireThat(subscription.metadata?.service_type==='business_software','Not an original BMS subscription');
 requireThat(subscription.status==='active','Active subscription required');
 requireThat(subscription.collection_method==='charge_automatically','Saved-card collection not configured');
 requireThat(!subscription.pending_update&&!subscription.schedule&&!subscription.cancel_at_period_end,'Pending/scheduled/cancelled subscription requires review');
 requireThat(subscription.currency==='gbp','GBP subscription required');
 const items=subscription.items?.data||[];
 requireThat(!subscription.items?.has_more,'All subscription items must be verified');
 const known=[catalogue.base.id,catalogue.ai.id,catalogue.extra.id];
 requireThat(new Set(known).size===3&&items.every(x=>known.includes(id(x.price))),'Unexpected catalogue or subscription item');
 const find=price=>items.filter(x=>id(x.price)===price);
 requireThat(find(catalogue.base.id).length===1&&find(catalogue.base.id)[0].quantity===1,'Exactly one base licence required');
 requireThat(find(catalogue.ai.id).length<=1&&find(catalogue.extra.id).length<=1,'Duplicate subscription item');
 requireThat(!find(catalogue.ai.id).length||find(catalogue.ai.id)[0].quantity===1,'Invalid AI quantity');
 const existingExtra=find(catalogue.extra.id)[0];
 requireThat(!existingExtra||integer(existingExtra.quantity,0,49),'Invalid extra-seat quantity');
 for(const item of items){const price=item.price,expected=catalogue[price.id===catalogue.base.id?'base':price.id===catalogue.ai.id?'ai':'extra'];requireThat(price.currency==='gbp'&&price.recurring?.interval==='month'&&price.recurring.interval_count===1&&price.unit_amount===expected.unitAmount,'Price/interval mismatch');}
 for(const price of Object.values(catalogue))requireThat(price.active===true&&price.currency==='gbp'&&price.interval==='month'&&integer(price.unitAmount,0,1000000),'Verified active monthly catalogue required');
 return {items,existingExtra,existingTotalUsers:1+(existingExtra?.quantity||0),hasAI:find(catalogue.ai.id).length===1};
}
function prepare({subscription,binding,catalogue,targetTotalUsers,preview,nowSeconds,taxPolicy}){
 const found=inspect(subscription,binding,catalogue);
 requireThat(found.existingTotalUsers===1,'First original-subscription upgrade only; later seat adjustments require verified delta-invoice support');
 requireThat(integer(targetTotalUsers,2,50)&&targetTotalUsers>found.existingTotalUsers,'Explicit increasing total user count required');
 requireThat(taxPolicy?.verified===true&&taxPolicy.evidenceRef&&['included','no_vat_added','additional'].includes(taxPolicy.basis),'Owner-grounded tax policy required');
 requireThat(preview.customerId===binding.customerId&&preview.subscriptionId===binding.subscriptionId&&preview.targetTotalUsers===targetTotalUsers,'Preview belongs to another upgrade');
 requireThat(preview.currency==='gbp'&&integer(preview.immediateTotal,0,1000000)&&integer(preview.recurringTotal,1,1000000),'Exact immediate and recurring totals required');
 requireThat(preview.kind==='immediate_proration'&&preview.prorationBehavior==='always_invoice','Combined upcoming invoice is not an immediate payment quote');
 requireThat(preview.verifiedTax===true&&preview.taxPolicyRef===taxPolicy.evidenceRef,'Preview tax must match verified policy');
 requireThat(integer(preview.prorationDate,1,nowSeconds)&&nowSeconds-preview.prorationDate<=300,'Stale preview');
 const quote={version:1,...binding,targetTotalUsers,additionalSeats:targetTotalUsers-found.existingTotalUsers,targetExtraQuantity:targetTotalUsers-1,currency:'gbp',immediateTotal:preview.immediateTotal,recurringTotal:preview.recurringTotal,prorationDate:preview.prorationDate,expiresAt:nowSeconds+300,renewalAt:preview.renewalAt,taxPolicy,subscriptionFingerprint:hash(subscription),catalogueFingerprint:hash(catalogue),extraPriceId:catalogue.extra.id,extraItemId:found.existingExtra?.id||null,minimumTerm:subscription.metadata?.minimum_term_months,minimumTermStartedAt:subscription.metadata?.minimum_term_started_at};
 quote.quoteHash=hash(quote);return Object.freeze(quote);
}
function consentCovers(quote,consent,nowSeconds){
 const {quoteHash,...rest}=quote;requireThat(hash(rest)===quoteHash,'Quote altered');
 requireThat(consent?.ownerAuthorityRef&&consent.clientConsentRef&&consent.verifiedByTrustedWorkflow===true,'Verified owner and customer authority required');
 requireThat(consent.subscriptionId===quote.subscriptionId&&consent.customerId===quote.customerId&&consent.tenantId===quote.tenantId&&consent.targetTotalUsers===quote.targetTotalUsers,'Consent identity or total-user mismatch');
 requireThat(consent.currency===quote.currency&&consent.collectionMethod==='saved_default_payment_method'&&consent.taxPolicyRef===quote.taxPolicy.evidenceRef,'Consent payment/tax mismatch');
 requireThat(integer(consent.maxImmediateTotal,0,1000000)&&quote.immediateTotal<=consent.maxImmediateTotal&&consent.recurringTotal===quote.recurringTotal,'Amounts exceed consent');
 requireThat(nowSeconds<=quote.expiresAt&&nowSeconds<=consent.expiresAt,'Expired quote or consent');
}
function updateParameters(quote){return {items:[{...(quote.extraItemId?{id:quote.extraItemId}:{}),price:quote.extraPriceId,quantity:quote.targetExtraQuantity}],payment_behavior:'pending_if_incomplete',proration_behavior:'always_invoice',proration_date:quote.prorationDate,billing_cycle_anchor:'unchanged'};}
function verifyPaidResult({subscription,invoice,binding,catalogue,targetTotalUsers}){
 const originalState=subscription.pending_update?{...subscription,pending_update:null}:subscription;
 // inspect checks the final subscription's exact customer/items and pricing.
 const checked=inspect(originalState,binding,catalogue);
 if(subscription.pending_update)return {state:'pending',grantSeats:false};
 if(!invoice||invoice.status!=='paid'||invoice.paid!==true)return {state:'awaiting_payment',grantSeats:false};
 requireThat(id(invoice.customer)===binding.customerId&&id(invoice.subscription||invoice.parent?.subscription_details?.subscription)===binding.subscriptionId,'Paid invoice binding mismatch');
 requireThat(!invoice.lines?.has_more,'All paid invoice lines required');
 const rows=invoice.lines?.data||[];
 const paidExtra=rows.filter(x=>(id(x.price)||x.pricing?.price_details?.price)===catalogue.extra.id&&x.amount>0);
 requireThat(paidExtra.length>0&&paidExtra.some(x=>integer(x.quantity,1,49)&&x.quantity===targetTotalUsers-1),'Paid invoice does not cover target extra seats');
 requireThat(checked.existingTotalUsers===targetTotalUsers,'Final applied quantity mismatch');
 return {state:'paid_applied',grantSeats:true,targetTotalUsers,invoiceId:invoice.id,subscriptionId:subscription.id};
}
async function execute({quote,consent,binding,catalogue,nowSeconds,adapters}){
 consentCovers(quote,consent,nowSeconds);
 requireThat(binding.tenantId===quote.tenantId&&binding.customerId===quote.customerId&&binding.subscriptionId===quote.subscriptionId&&binding.orderId===quote.orderId,'Execution tenant binding mismatch');
 const operationId='bms-original-seat-upgrade:'+hash({tenant:quote.tenantId,subscription:quote.subscriptionId,clientConsentRef:consent.clientConsentRef,targetTotalUsers:quote.targetTotalUsers});
 // begin() is an atomic, durable compare-and-insert. For an interrupted run it
 // returns the same stored operation, never a new idempotency key.
 const operation=await adapters.ledger.begin(operationId,{quote,consent});
 requireThat(operation.quoteHash===quote.quoteHash,'Existing operation quote differs; reconcile, never retry as new charge');
 if(operation.state==='completed')return operation.result;
 requireThat(operation.state==='new'||operation.state==='retryable','Operation requires reconciliation');
 const subscription=await adapters.stripe.retrieveSubscription(quote.subscriptionId);
 requireThat(hash(subscription)===quote.subscriptionFingerprint,'Subscription changed after preview; re-quote');
 requireThat(hash(catalogue)===quote.catalogueFingerprint,'Catalogue changed after preview');
 const result=await adapters.stripe.updateSubscription(quote.subscriptionId,updateParameters(quote),{idempotencyKey:operationId});
 await adapters.ledger.recordStripeResult(operationId,{subscriptionId:result.id,invoiceId:id(result.latest_invoice),state:result.pending_update?'pending':'submitted'});
 // No entitlement changes here. Signed events plus fresh invoice/subscription
 // reads are separately reconciled in one transaction by reconcilePaid().
 return {operationId,state:result.pending_update?'pending':'submitted',grantSeats:false};
}
async function reconcilePaid({operation,event,subscription,invoice,binding,catalogue,adapters}){
 requireThat(event.signatureVerified===true&&event.id&&event.id.startsWith('evt_'),'Signed provider event required');
 requireThat(['invoice.paid','customer.subscription.pending_update_applied'].includes(event.type),'Event cannot authorise extra seats');
 requireThat(operation.binding.tenantId===binding.tenantId&&operation.binding.subscriptionId===binding.subscriptionId&&operation.binding.customerId===binding.customerId,'Operation binding mismatch');
 requireThat(subscription.latest_invoice&&id(subscription.latest_invoice)===operation.invoiceId,'Subscription latest invoice mismatch');
 requireThat(invoice.id===operation.invoiceId&&invoice.amount_paid===operation.immediateTotal&&invoice.total===operation.immediateTotal&&invoice.currency===operation.currency,'Payment differs from authorised invoice');
 const rows=invoice.lines?.data||[],line=rows[0];
 requireThat(invoice.billing_reason==='subscription_update'&&rows.length===1&&!invoice.lines?.has_more,'Exact update invoice required');
 requireThat(line&&(line.proration===true||line.parent?.subscription_item_details?.proration===true)&&line.amount===operation.immediateTotal,'Exact authorised proration required');
 requireThat(operation.quote&&line.period?.start===operation.quote.prorationDate&&line.period?.end===operation.quote.renewalAt,'Authorised proration period mismatch');
 const outcome=verifyPaidResult({subscription,invoice,binding,catalogue,targetTotalUsers:operation.targetTotalUsers});
 if(!outcome.grantSeats)return outcome;
 // Commit must lock operation + binding, dedupe event/invoice, update only paid
 // entitlement, and record before/after. It never changes questionnaire answers,
 // launches a tenant, invites users, resets a term or sends customer messages.
 return adapters.ledger.commitPaidEntitlement({operationId:operation.id,eventId:event.id,invoiceId:invoice.id,tenantId:binding.tenantId,subscriptionId:binding.subscriptionId,targetTotalUsers:outcome.targetTotalUsers});
}
module.exports={prepare,inspect,consentCovers,updateParameters,verifyPaidResult,execute,reconcilePaid,hash};
