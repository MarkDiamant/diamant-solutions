'use strict';
const core=require('./bms-original-subscription-upgrade.cjs');
const id=x=>typeof x==='string'?x:x?.id;
const allowed=['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','customer.subscription.pending_update_applied','customer.subscription.pending_update_expired'];
async function handleVerifiedEvent({event,signatureVerified,adapters,catalogue}){
 if(signatureVerified!==true)throw Error('Signature verification required');
 if(!allowed.includes(event.type))return {ignored:true};
 const object=event.data?.object||{},subscriptionId=event.type.startsWith('invoice.')?id(object.subscription||object.parent?.subscription_details?.subscription):object.id;
 if(!subscriptionId?.startsWith('sub_'))return {ignored:true};
 const operation=await adapters.ledger.lookup(subscriptionId);if(!operation)return {ignored:true};
 if(event.type==='customer.subscription.deleted')return {ignored:true};
 if(event.type.startsWith('invoice.')&&object.id&&operation.invoiceId&&object.id!==operation.invoiceId)return {ignored:true};
 if(operation.state==='paid_applied')return event.type==='customer.subscription.updated'?{ignored:true}:{duplicate:true};
 const subscription=await adapters.stripe.retrieveSubscription(subscriptionId);
 if(subscription.metadata?.service_type!=='business_software')throw Error('Not original BMS subscription');
 if(id(subscription.customer)!==operation.binding.customerId)throw Error('Subscription/customer mismatch');
 if(!operation.invoiceId)throw Error('Interrupted execution needs explicit invoice recovery before webhook processing');
 const invoice=await adapters.stripe.retrieveInvoice(operation.invoiceId);
 if(id(invoice.customer)!==operation.binding.customerId||id(invoice.subscription||invoice.parent?.subscription_details?.subscription)!==subscriptionId)throw Error('Invoice binding mismatch');
 if(core.invoicePaid(invoice)&&!subscription.pending_update){
  // A stale failed/expired notification can arrive after success. Fresh provider
  // truth authorises reconciliation, never the stale event's claimed status.
  return core.reconcilePaid({operation,event:{id:event.id,type:'invoice.paid',signatureVerified:true},subscription,invoice,binding:operation.binding,catalogue,adapters});
 }
 const state=invoice.status==='void'?'expired':invoice.status==='uncollectible'?'failed':'pending';
 if(operation.state==='expired'||operation.state==='failed')return {state:operation.state,grantSeats:false};
 await adapters.ledger.observe(operation.id,event.id,operation.invoiceId,state);
 return {state,grantSeats:false};
}
module.exports={handleVerifiedEvent,allowed};
