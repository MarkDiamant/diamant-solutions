// Isolated acceptance one-off. Never runs without an explicitly opted-in test-only build flag.
(async()=>{
 if(process.env.BMS_CREATE_TEST_PRICES!=='true'){
  if(process.env.BMS_TEST_ISOLATED!=='true')return;
  const key=process.env.STRIPE_SECRET_KEY;
  if(!key?.startsWith('sk_test_'))throw Error('Isolated price verification requires sk_test_');
  const amounts={BASE:[4900,49900],EXTRA:[1000,10000],AI:[1500,15000]};
  for(const [component,pair] of Object.entries(amounts)){
   for(const [i,period] of ['MONTHLY','ANNUAL'].entries()){
    const id=process.env['BMS_STRIPE_TEST_'+period+'_'+component+'_PRICE_ID'];
    if(!/^price_[A-Za-z0-9]+$/.test(id||''))throw Error('Missing test price ID for '+period+' '+component);
    const r=await fetch('https://api.stripe.com/v1/prices/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+key}});
    if(!r.ok)throw Error('Test price lookup failed '+period+' '+component+' HTTP '+r.status);
    const p=await r.json();
    if(p.livemode!==false||!p.active||p.currency!=='gbp'||p.unit_amount!==pair[i]||p.recurring?.interval!==(i===0?'month':'year')||p.recurring?.interval_count!==1)throw Error('Invalid test price '+period+' '+component);
   }
  }
  console.log('PASS All six isolated Stripe prices verified against Stripe test API');
  return;
 }
 if(process.env.BMS_TEST_ISOLATED!=='true'||process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='bms-signup-acceptance-hardening-20261109')throw Error('Refusing Stripe price provisioning outside isolated Preview branch');
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key?.startsWith('sk_test_'))throw Error('Refusing non-test Stripe credentials');
 async function api(path,params){
  const response=await fetch('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers:{Authorization:'Bearer '+key,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(params?{body:new URLSearchParams(params)}:{})});
  const result=await response.json();if(!response.ok)throw Error('Stripe test API '+path+' returned HTTP '+response.status);return result;
 }
 const expected=[['base','BMS Base Subscription',4900,49900],['extra','BMS Additional Seat',1000,10000],['ai','BMS Ruby AI',1500,15000]];
 const products=await api('products?limit=100');
 if(products.has_more)throw Error('Product catalogue exceeds 100; refusing creation without full duplicate check');
 const mapping={};
 for(const [slug,name,monthly,annual] of expected){
  let matches=products.data.filter(p=>p.name===name&&p.active);
  if(matches.length>1)throw Error('Duplicate active test products for '+name);
  const product=matches[0]||await api('products',{name,'metadata[bms_acceptance]':'true','metadata[bms_component]':slug});
  const prices=await api('prices?product='+encodeURIComponent(product.id)+'&limit=100');
  if(prices.has_more)throw Error('Too many prices on '+name);
  for(const [period,amount] of [['monthly',monthly],['annual',annual]]){
   const match=prices.data.filter(p=>p.active&&p.currency==='gbp'&&p.unit_amount===amount&&p.type==='recurring'&&p.recurring?.interval===(period==='monthly'?'month':'year')&&p.recurring?.interval_count===1);
   if(match.length>1)throw Error('Duplicate matching test prices for '+name+' '+period);
   const price=match[0]||await api('prices',{product:product.id,currency:'gbp',unit_amount:String(amount),'recurring[interval]':period==='monthly'?'month':'year','metadata[bms_acceptance]':'true'});
   if(price.livemode!==false)throw Error('Unexpected live Stripe price');
   mapping['BMS_STRIPE_TEST_'+period.toUpperCase()+'_'+slug.toUpperCase()+'_PRICE_ID']=price.id;
  }
 }
 console.log('BMS_TEST_PRICE_IDS='+JSON.stringify(mapping));
})().catch(e=>{console.error('BMS test-only price setup failed: '+e.message);process.exitCode=1;});
