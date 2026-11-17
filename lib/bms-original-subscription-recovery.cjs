'use strict';
const events=require('./bms-original-subscription-events.cjs');
const id=x=>typeof x==='string'?x:x?.id;
// Only a verified provider event can recover a lost update response. This never
// repeats a subscription update, creates an invoice or attempts another charge.
async function recover({operation,eventId,adapters,catalogue}){
 if(!operation||!/^evt_[A-Za-z0-9_]+$/.test(eventId))throw Error('Operation and provider event required');
 const event=await adapters.stripe.retrieveEvent(eventId);
 if(event.id!==eventId||!events.allowed.includes(event.type))throw Error('Unsupported provider event');
 const object=event.data?.object||{},subId=event.type.startsWith('invoice.')?id(object.subscription||object.parent?.subscription_details?.subscription):object.id;
 if(subId!==operation.binding.subscriptionId)throw Error('Recovery event subscription mismatch');
 if(!operation.invoiceId){
  const subscription=await adapters.stripe.retrieveSubscription(subId),invoiceId=id(subscription.latest_invoice);
  if(!invoiceId)throw Error('Recovery invoice missing');
  const invoice=await adapters.stripe.retrieveInvoice(invoiceId);
  if(!Number.isFinite(new Date(operation.created_at).getTime())||!Number.isSafeInteger(invoice.created)||id(invoice.customer)!==operation.binding.customerId||id(invoice.subscription||invoice.parent?.subscription_details?.subscription)!==subId||invoice.billing_reason!=='subscription_update'||invoice.created<Math.floor(new Date(operation.created_at).getTime()/1000)-5||invoice.total!==operation.immediateTotal||invoice.currency!==operation.currency)throw Error('Recovery invoice does not match operation');
  const rows=invoice.lines?.data||[];
  if(invoice.lines?.has_more||rows.length!==1||rows[0].quantity!==operation.targetTotalUsers-1||(id(rows[0].price)||rows[0].pricing?.price_details?.price)!==catalogue.extra.id)throw Error('Recovery invoice quantities mismatch');
  await adapters.ledger.recordStripeResult(operation.id,{subscriptionId:subId,invoiceId,state:subscription.pending_update?'pending':'submitted'});
 }
 // Authentic provider API read is equivalent source verification for this
 // bounded internal recovery, not acceptance of user-supplied event JSON.
 return events.handleVerifiedEvent({event,signatureVerified:true,adapters,catalogue});
}
module.exports={recover};
