// Real SQL execution of the draft-tenant migrations against an isolated PostgreSQL (PGlite).
// Fictional fixtures only; no live data. Covers: v2 path, legacy v1 normalisation with the
// source row unchanged, verified-entitlement seats with the 1-vs-2 checkout discrepancy,
// idempotency (including a two-argument legacy call), auth refusal, tenant isolation and
// upgrade-ledger disagreement.
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const m1=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261118150000_bms_draft_tenant_preparation.sql'),'utf8');
const m2=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261118160000_bms_draft_legacy_normalisation.sql'),'utf8');
const tenant='11111111-1111-4111-8111-111111111111',order='22222222-2222-4222-8222-222222222222',reviewer='33333333-3333-4333-8333-333333333333';
const entitlement=(seats=1,sub='sub_fixture',cus='cus_fixture')=>({seats,hasAI:true,subscriptionId:sub,customerId:cus,retrievedAt:'2026-11-18T18:00:00Z'});
const normalised={version:2,modules:{enabled:['Jobs'],hidden:['Xero']},completion:{version:1,needsClarification:true,unresolvedQuestions:[{key:'jobStages',label:'Stages?'}]},business:{name:'Fictional Flooring'},tasks:[{key:'verify_subscription',label:'Verify paid subscription and user seats',status:'pending'}]};
(async()=>{const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE TABLE tenants(id uuid PRIMARY KEY,stripe_subscription_id text UNIQUE,stripe_customer_id text UNIQUE,licensed_users integer NOT NULL DEFAULT 2 CHECK(licensed_users>=1),status text DEFAULT 'pending');
CREATE TABLE checkout_orders(id uuid PRIMARY KEY,tenant_id uuid,service_type text,payment_status text,stripe_subscription_id text,stripe_customer_id text,users integer,paid_at timestamptz,customer_email text,ai_included boolean,plan_key text,billing_interval text);
CREATE TABLE onboarding(tenant_id uuid PRIMARY KEY,service_type text,status text,proposed_config jsonb,answers jsonb);
CREATE TABLE bms_original_subscription_upgrades(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),original_tenant_id uuid,stripe_subscription_id text,stripe_customer_id text,checkout_order_id uuid,target_total_users integer,state text);
CREATE TABLE business_software_tenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE,business_name text,canonical_host text,status text,billing_mode text,reference_tenant boolean,data_backend text);
CREATE TABLE business_software_tenant_settings(tenant_id uuid PRIMARY KEY,business_name text,email text,timezone text,currency text,app_config jsonb NOT NULL DEFAULT '{}');
CREATE TABLE business_software_subscriptions(tenant_id uuid PRIMARY KEY,plan_code text,billing_status text,billing_interval text,included_users integer,extra_users integer,ai_enabled boolean,stripe_customer_id text,stripe_subscription_id text,current_period_end timestamptz,updated_at timestamptz);
CREATE TABLE business_software_users(tenant_id uuid,email text,role text,status text,display_name text);
CREATE TABLE business_software_job_sequences(tenant_id uuid,last_number integer);
CREATE TABLE business_software_onboarding_reviews(tenant_id uuid PRIMARY KEY,reviewer_id uuid,reviewed_at timestamptz,approved_at timestamptz,applied_bms_tenant_id uuid,activation_email_sent_at timestamptz,activation_email_error text,review_notes text,updated_at timestamptz);
`);await db.exec(m1);await db.exec(m2);
async function seed(status='awaiting_clarification',{users=1,config='{"version":2}'}={}){await db.exec('TRUNCATE tenants,checkout_orders,onboarding,bms_original_subscription_upgrades,business_software_tenants,business_software_tenant_settings,business_software_subscriptions,business_software_users,business_software_job_sequences,business_software_onboarding_reviews CASCADE');await db.query("INSERT INTO onboarding VALUES($1,'business_software',$2,$3::jsonb,'{\"businessName\":\"Fictional Flooring\",\"contactName\":\"Fixture Owner\",\"users\":\"7\",\"terminology\":\"Discuss during setup\"}')",[tenant,status,config]);await db.query("INSERT INTO checkout_orders VALUES($1,$2,'business_software','paid','sub_fixture','cus_fixture',$3,now(),'owner@example.invalid',true,'business-software','monthly')",[order,tenant,users]);}
const role=r=>db.query("SELECT set_config('request.jwt.claim.role',$1,false)",[r]);
const prepare=(t=tenant,norm=null,ent=entitlement())=>db.query('SELECT bms_prepare_draft_onboarding_tenant($1,$2,$3,$4) AS id',[t,reviewer,norm?JSON.stringify(norm):null,ent?JSON.stringify(ent):null]);
const prepareLegacy2Arg=(t=tenant)=>db.query('SELECT bms_prepare_draft_onboarding_tenant($1,$2) AS id',[t,reviewer]);

// Permission: only the service role may provision.
await seed();await role('authenticated');await assert.rejects(prepare(),/Service role required/);await role('anon');await assert.rejects(prepare(),/Service role required/);
assert.equal((await db.query('SELECT count(*) n FROM business_software_tenants')).rows[0].n,0,'refused calls create nothing');
console.log('PASS non-service roles refused before any write');

// Happy path v2: suspended draft, inert by design, onboarding untouched, provenance recorded.
await role('service_role');const before=(await db.query('SELECT proposed_config FROM onboarding')).rows[0].proposed_config;
const id=(await prepare()).rows[0].id;assert(id);
const t=(await db.query('SELECT * FROM business_software_tenants')).rows[0];
assert.equal(t.id,id);assert.equal(t.status,'suspended');assert.equal(t.business_name,'Fictional Flooring');assert.equal(t.billing_mode,'paid');assert.equal(t.reference_tenant,false);
assert.equal(t.canonical_host,t.slug+'.diamantsolutions.co.uk');
const cfg=(await db.query('SELECT app_config FROM business_software_tenant_settings')).rows[0].app_config;
assert.equal(cfg.onboarding.draft,true);assert.equal(cfg.onboarding.approved,false);assert.equal(cfg.ai.enabled,true);assert.equal(cfg.plan.licensedUsers,1);
const u=(await db.query('SELECT * FROM business_software_users')).rows;assert.equal(u.length,1);assert.equal(u[0].status,'invited');assert.equal(u[0].role,'owner');assert.equal(u[0].email,'owner@example.invalid');
const sub=(await db.query('SELECT * FROM business_software_subscriptions')).rows[0];assert.equal(sub.stripe_subscription_id,'sub_fixture');assert.equal(sub.billing_status,'active');assert.equal(sub.ai_enabled,true);assert.equal(sub.included_users,1);
const review=(await db.query('SELECT * FROM business_software_onboarding_reviews')).rows[0];assert.equal(review.applied_bms_tenant_id,id);assert.equal(review.approved_at,null);
assert.equal(review.draft_provenance.configSource,'submitted_v2');assert.equal(review.draft_provenance.normalisedConfig,null);assert.equal(review.draft_provenance.seatDiscrepancy,false);
assert.deepEqual((await db.query('SELECT proposed_config FROM onboarding')).rows[0].proposed_config,before,'source submission row unchanged');
assert.equal((await db.query('SELECT status FROM onboarding')).rows[0].status,'awaiting_clarification','client answers stay editable');
assert.equal((await db.query('SELECT last_number n FROM business_software_job_sequences')).rows[0].n,0);
console.log('PASS v2 path creates suspended inert draft, provenance recorded, onboarding row untouched');

// Idempotency: repeat calls return the same draft; a legacy two-argument call also resolves.
assert.equal((await prepare()).rows[0].id,id);assert.equal((await prepareLegacy2Arg()).rows[0].id,id);
assert.equal((await db.query('SELECT count(*) n FROM business_software_tenants')).rows[0].n,1);
assert.equal((await db.query('SELECT count(*) n FROM business_software_users')).rows[0].n,1);
assert.equal((await db.query('SELECT count(*) n FROM business_software_subscriptions')).rows[0].n,1);
console.log('PASS repeat calls idempotent including two-argument legacy signature, no duplicates');

// New drafts always require verified entitlement, even for v2 submissions.
await seed();await assert.rejects(prepare(tenant,null,null),/Verified paid entitlement required/);
await assert.rejects(prepare(tenant,null,entitlement(1,'sub_other')),/Verified paid entitlement required/);
await assert.rejects(prepare(tenant,null,entitlement(0)),/Verified paid entitlement required/);
await assert.rejects(prepare(tenant,null,{...entitlement(),retrievedAt:null}),/Verified paid entitlement required/);
assert.equal((await db.query('SELECT count(*) n FROM business_software_tenants')).rows[0].n,0);
console.log('PASS missing, mismatched or malformed entitlement refused');

// Legacy v1 submission: normalised config accepted, original row preserved, provenance marked.
await seed('awaiting_clarification',{config:'{"businessName":"Fictional Flooring","source":"onboarding_submission"}'});
const legacyBefore=(await db.query('SELECT proposed_config FROM onboarding')).rows[0].proposed_config;
await assert.rejects(prepare(),/Verified normalised configuration required for legacy submission/);
const idL=(await prepare(tenant,normalised)).rows[0].id;assert(idL);
const reviewL=(await db.query('SELECT * FROM business_software_onboarding_reviews')).rows[0];
assert.equal(reviewL.draft_provenance.configSource,'legacy_v1_normalised_at_draft');
assert.equal(reviewL.draft_provenance.originalProposedConfigVersion,null);
assert.deepEqual(reviewL.draft_provenance.normalisedConfig,normalised);
assert.equal(reviewL.draft_provenance.normalisedBy,reviewer);
assert.deepEqual((await db.query('SELECT proposed_config FROM onboarding')).rows[0].proposed_config,legacyBefore,'legacy submission row preserved verbatim');
console.log('PASS legacy v1 normalised at draft time with provenance; original submission untouched');

// Normalised config must not be supplied for current-version submissions.
await seed();await assert.rejects(prepare(tenant,normalised),/only accepted for legacy submissions/);
console.log('PASS normalised config rejected for v2 submissions');

// Seat discrepancy: checkout recorded 2 users, verified paid entitlement is 1 seat.
await seed('awaiting_clarification',{users:2});
const idD=(await prepare(tenant,null,entitlement(1))).rows[0].id;
assert.equal((await db.query('SELECT included_users n FROM business_software_subscriptions WHERE tenant_id=$1',[idD])).rows[0].n,1,'draft seats follow verified entitlement');
assert.equal((await db.query("SELECT app_config->'plan'->>'licensedUsers' n FROM business_software_tenant_settings WHERE tenant_id=$1",[idD])).rows[0].n,'1');
const reviewD=(await db.query('SELECT * FROM business_software_onboarding_reviews')).rows[0];
assert.equal(reviewD.draft_provenance.seatDiscrepancy,true);assert.equal(reviewD.draft_provenance.checkoutUsers,2);assert.equal(reviewD.draft_provenance.verifiedEntitlement.seats,1);
assert.equal((await db.query('SELECT users FROM checkout_orders')).rows[0].users,2,'historical checkout row preserved');
console.log('PASS 1-vs-2 discrepancy: draft uses verified seat, discrepancy recorded, checkout untouched');

// Refusals: approved setups, missing payment, wrong onboarding state.
await db.query("UPDATE business_software_onboarding_reviews SET approved_at=now()");
await assert.rejects(prepare(),/already approved/);
await db.query("UPDATE business_software_onboarding_reviews SET approved_at=null");
await seed('in_progress');await assert.rejects(prepare(),/ready for draft preparation/);
await seed();await db.query('DELETE FROM checkout_orders');await assert.rejects(prepare(),/Verified paid subscription required/);
await seed();await db.query("UPDATE checkout_orders SET customer_email=''");await assert.rejects(prepare(),/customer email missing/);
console.log('PASS approved/unpaid/incomplete/ownerless setups refused');

// A subscription already bound to another tenant can never be re-linked.
await seed();await db.query("INSERT INTO business_software_tenants(slug,business_name,canonical_host,status,billing_mode,reference_tenant,data_backend) VALUES('other-fixture','Other','other-fixture.diamantsolutions.co.uk','active','paid',false,'central') RETURNING id");
const other=(await db.query("SELECT id FROM business_software_tenants WHERE slug='other-fixture'")).rows[0].id;
await db.query("INSERT INTO business_software_subscriptions(tenant_id,plan_code,billing_status,stripe_subscription_id,stripe_customer_id) VALUES($1,'business-software','active','sub_fixture','cus_fixture')",[other]);
await assert.rejects(prepare(),/different BMS tenant/);
console.log('PASS subscription bound elsewhere refused');

// Upgrade ledger must agree with the verified entitlement.
await seed();await db.query("INSERT INTO bms_original_subscription_upgrades(original_tenant_id,stripe_subscription_id,stripe_customer_id,checkout_order_id,target_total_users,state) VALUES($1,'sub_fixture','cus_fixture',$2,8,'paid_applied')",[tenant,order]);
await assert.rejects(prepare(tenant,null,entitlement(1)),/Paid entitlement sources disagree/);
const id2=(await prepare(tenant,null,entitlement(8))).rows[0].id;
assert.equal((await db.query('SELECT included_users n FROM business_software_subscriptions WHERE tenant_id=$1',[id2])).rows[0].n,8);
console.log('PASS upgrade ledger disagreement refused; matching verified seats honoured');

await db.close();})().catch(e=>{console.error(e);process.exit(1)});
