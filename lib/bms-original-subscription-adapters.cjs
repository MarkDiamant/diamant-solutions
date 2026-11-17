'use strict';
// Server-only transport. Inject fetch for isolated fixtures; never log credentials.
const core=require('./bms-original-subscription-upgrade.cjs');
const id=x=>typeof x==='string'?x:x?.id;
function ensure(v,m){if(!v)throw Error(m)}
function form(value,prefix='',out=new URLSearchParams()){
 for(const [k,v] of Object.entries(value)){if(v===undefined||v===null)continue;const key=prefix?`${prefix}[${k}]`:k;if(typeof v==='object')form(v,key,out);else out.append(key,String(v));}return out;
}
function createAdapters({fetch:request=globalThis.fetch,stripeKey,supabaseUrl,serviceKey}){
 ensure(stripeKey&&supabaseUrl&&serviceKey,'Server configuration missing');
 ensure(!(stripeKey.startsWith('sk_live_')&&(process.env.VERCEL_ENV==='preview'||process.env.BMS_TEST_ISOLATED==='true')),'Live original-subscription operations prohibited in isolated preview');
 async function stripe(path,method='GET',body,key){const response=await request('https://api.stripe.com/v1/'+path,{method,headers:{Authorization:'Bearer '+stripeKey,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body?{body:form(body).toString()}:{}),cache:'no-store'});ensure(response.ok,'Stripe request failed: '+response.status);return response.json();}
 async function rest(path,method='GET',body){const response=await request(supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});ensure(response.ok,'Billing registry unavailable: '+response.status);return response.status===204?null:response.json();}
 const rpc=(name,body)=>rest('rpc/'+name,'POST',body);
 return {rest,stripe:{retrieveSubscription:sub=>stripe('subscriptions/'+encodeURIComponent(sub)),updateSubscription:(sub,params,{idempotencyKey})=>stripe('subscriptions/'+encodeURIComponent(sub),'POST',params,idempotencyKey),retrieveInvoice:async invoice=>{const data=await stripe('invoices/'+encodeURIComponent(invoice));data.lines=await stripe('invoices/'+encodeURIComponent(invoice)+'/lines?limit=100');return data;},retrieveEvent:event=>stripe('events/'+encodeURIComponent(event)),retrievePaymentMethod:method=>stripe('payment_methods/'+encodeURIComponent(method)),retrievePrice:price=>stripe('prices/'+encodeURIComponent(price)),retrieveCustomer:customer=>stripe('customers/'+encodeURIComponent(customer)),preview:params=>stripe('invoices/create_preview','POST',params)},ledger:{begin:(operationId,{quote,consent})=>rpc('bms_original_upgrade_begin',{p_id:operationId,p_quote:quote,p_consent:consent}),observe:(operationId,eventId,invoiceId,state)=>rpc('bms_original_upgrade_observe',{p_id:operationId,p_event:eventId,p_invoice:invoiceId,p_state:state}),recordStripeResult:(operationId,result)=>rpc('bms_original_upgrade_record',{p_id:operationId,p_result:result}),commitPaidEntitlement:p=>rpc('bms_original_upgrade_commit',{p_id:p.operationId,p_event:p.eventId,p_invoice:p.invoiceId,p_tenant:p.tenantId,p_subscription:p.subscriptionId,p_total:p.targetTotalUsers}),lookup:async subscriptionId=>{const rows=await rest('bms_original_subscription_upgrades?stripe_subscription_id=eq.'+encodeURIComponent(subscriptionId)+'&order=created_at.desc&limit=2');ensure(rows.length<=1,'Ambiguous operation');const r=rows[0];return r?{...r,id:r.operation_id,binding:{tenantId:r.original_tenant_id,orderId:r.checkout_order_id,subscriptionId:r.stripe_subscription_id,customerId:r.stripe_customer_id},invoiceId:r.invoice_id,immediateTotal:r.immediate_total,targetTotalUsers:r.target_total_users}:null;},binding:tenantId=>rpc('bms_original_upgrade_binding',{p_tenant:tenantId})}};
}
async function readCatalogue(adapters,ids){const pairs=await Promise.all(Object.entries(ids).map(async([kind,priceId])=>{const p=await adapters.stripe.retrievePrice(priceId);ensure(p.id===priceId&&p.recurring?.interval_count===1&&p.recurring?.usage_type==='licensed','Catalogue identity/interval mismatch');return [kind,{id:p.id,active:p.active,currency:p.currency,interval:p.recurring.interval,unitAmount:p.unit_amount}]}));return Object.fromEntries(pairs);}
function validateNoAdjustments(subscription,customer){
 ensure(!customer.deleted&&id(customer)===id(subscription.customer),'Customer mismatch');
 ensure((customer.balance||0)===0&&Object.values(customer.invoice_credit_balance||{}).every(x=>x===0),'Customer credit/debit balance requires manual quote');
 ensure(!subscription.automatic_tax?.enabled&&!(subscription.default_tax_rates||[]).length,'Tax-enabled subscription needs explicit supported tax quote');
 ensure(!(subscription.discounts||[]).length&&!subscription.discount,'Discounted subscription requires manual quote');
 ensure((subscription.items?.data||[]).every(x=>!(x.tax_rates||[]).length&&!(x.discounts||[]).length),'Item tax/discount requires manual quote');
 ensure(subscription.default_payment_method||customer.invoice_settings?.default_payment_method||subscription.default_source||customer.default_source,'No saved collection method');
}
function immediatePreview({raw,subscription,binding,catalogue,targetTotalUsers,nowSeconds,taxPolicy}){
 ensure(taxPolicy?.basis==='no_vat_added','Only explicitly approved no-VAT-added treatment is supported');
 ensure(id(raw.customer)===binding.customerId&&raw.currency==='gbp'&&!raw.lines?.has_more,'Preview identity/currency/lines mismatch');
 ensure(!(raw.total_taxes||[]).some(x=>x.amount!==0)&&!(raw.total_tax_amounts||[]).some(x=>x.amount!==0)&&!(raw.total_discount_amounts||[]).length,'Preview has tax/discount adjustments');
 ensure(!raw.automatic_tax?.enabled&&(raw.starting_balance||0)===0,'Preview tax/balance adjustment');
 const all=raw.lines?.data||[],prorations=all.filter(x=>x.proration===true||x.parent?.subscription_item_details?.proration===true);
 ensure(prorations.length===1,'Exactly one new extra-seat proration required');
 const row=prorations[0],price=id(row.price)||row.pricing?.price_details?.price;
 ensure(price===catalogue.extra.id&&row.quantity===targetTotalUsers-1&&Number.isSafeInteger(row.amount)&&row.amount>0,'Unexpected immediate proration');
 // The provider documents isolating proration lines from the combined upcoming
 // invoice. Only zero-tax, zero-balance, no-discount first additions are allowed.
 ensure(all.every(x=>[catalogue.base.id,catalogue.ai.id,catalogue.extra.id].includes(id(x.price)||x.pricing?.price_details?.price)&&x.type!=='invoiceitem'&&!x.parent?.invoice_item_details),'Unrelated pending invoice item');
 ensure(Number.isSafeInteger(raw.total)&&raw.total===all.reduce((sum,line)=>sum+line.amount,0),'Preview contains unsupported invoice-level adjustments');
 const hasAI=subscription.items.data.some(x=>id(x.price)===catalogue.ai.id);
 return {kind:'immediate_proration',prorationBehavior:'always_invoice',customerId:binding.customerId,subscriptionId:binding.subscriptionId,targetTotalUsers,currency:'gbp',immediateTotal:row.amount,recurringTotal:catalogue.base.unitAmount+(hasAI?catalogue.ai.unitAmount:0)+(targetTotalUsers-1)*catalogue.extra.unitAmount,verifiedTax:true,taxPolicyRef:taxPolicy.evidenceRef,prorationDate:nowSeconds,renewalAt:subscription.items.data[0].current_period_end||subscription.current_period_end};
}
async function quote({binding,targetTotalUsers,taxPolicy,catalogue,adapters,nowSeconds}){
 const subscription=await adapters.stripe.retrieveSubscription(binding.subscriptionId);core.inspect(subscription,binding,catalogue);
 const customer=await adapters.stripe.retrieveCustomer(binding.customerId);validateNoAdjustments(subscription,customer);
 const paymentMethodId=id(subscription.default_payment_method||customer.invoice_settings?.default_payment_method);ensure(paymentMethodId,'Default payment method must be explicit');const method=await adapters.stripe.retrievePaymentMethod(paymentMethodId);ensure(method.id===paymentMethodId&&['card','link'].includes(method.type)&&id(method.customer)===binding.customerId,'Verified saved card/Link method required');
 ensure(subscription.latest_invoice,'Latest original invoice required');const latest=await adapters.stripe.retrieveInvoice(id(subscription.latest_invoice));ensure(latest.paid===true&&latest.status==='paid'&&id(latest.customer)===binding.customerId&&id(latest.subscription||latest.parent?.subscription_details?.subscription)===binding.subscriptionId,'Current period must already be paid');
 const raw=await adapters.stripe.preview({customer:binding.customerId,subscription:binding.subscriptionId,subscription_details:{items:[...subscription.items.data.map(item=>({id:item.id,price:id(item.price),quantity:item.quantity})),{price:catalogue.extra.id,quantity:targetTotalUsers-1}],proration_date:nowSeconds,proration_behavior:'always_invoice',billing_cycle_anchor:'unchanged'}});
 return core.prepare({subscription,binding,catalogue,targetTotalUsers,taxPolicy,nowSeconds,preview:immediatePreview({raw,subscription,binding,catalogue,targetTotalUsers,nowSeconds,taxPolicy})});
}
module.exports={createAdapters,readCatalogue,validateNoAdjustments,immediatePreview,quote,form};
