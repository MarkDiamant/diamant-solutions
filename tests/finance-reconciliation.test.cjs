const {test}=require('node:test');const assert=require('node:assert/strict');const {reconcile}=require('../business-software-core/lib/finance-reconcile.cjs');
test('reconciles pounds and pence',()=>assert.deepEqual(reconcile([{id:'q'}],[{total:120.50,amount_paid:20.25,amount_due:100.25,source_quote_id:'q'}]),{invoiced_total:120.5,paid_total:20.25,outstanding_total:100.25}));
test('rejects inconsistent invoice',()=>assert.throws(()=>reconcile([],[{total:100,amount_paid:60,amount_due:60}])));
test('rejects cross-job quotation',()=>assert.throws(()=>reconcile([],[{total:100,amount_paid:0,amount_due:100,source_quote_id:'elsewhere'}])));
test('rejects invalid financial numbers',()=>assert.throws(()=>reconcile([],[{total:'NaN',amount_paid:0,amount_due:0}])));
