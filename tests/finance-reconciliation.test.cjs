const {test}=require('node:test');const assert=require('node:assert/strict');const {reconcile,quoteTotals}=require('../business-software-core/lib/finance-reconcile.cjs');
test('reconciles pounds and pence',()=>assert.deepEqual(reconcile([{id:'q'}],[{total:120.50,amount_paid:20.25,amount_due:100.25,source_quote_id:'q'}]),{invoiced_total:120.5,paid_total:20.25,outstanding_total:100.25}));
test('rejects inconsistent invoice',()=>assert.throws(()=>reconcile([],[{total:100,amount_paid:60,amount_due:60}])));
test('rejects cross-job quotation',()=>assert.throws(()=>reconcile([],[{total:100,amount_paid:0,amount_due:100,source_quote_id:'elsewhere'}])));
test('rejects invalid financial numbers',()=>assert.throws(()=>reconcile([],[{total:'NaN',amount_paid:0,amount_due:0}])));
test('calculates VAT from integer pence',()=>assert.deepEqual(quoteTotals(99.99,20),{net:99.99,vat:20,gross:119.99}));
test('rejects invalid VAT rate',()=>assert.throws(()=>quoteTotals(100,200)));
test('rejects sub-penny invoice amounts',()=>assert.throws(()=>reconcile([],[{total:1.005,amount_paid:0,amount_due:1.005}])));
test('rejects VAT precision beyond two decimals',()=>assert.throws(()=>quoteTotals(100,20.123)));
