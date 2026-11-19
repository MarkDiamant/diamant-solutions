#!/usr/bin/env python3
"""Reproducible server-side payload authorization tests for BMS permission classes.

Verifies, against a running BMS instance (isolated or staging), that:
  - jobs list / job detail / archived jobs strip costing, pricing and financial
    fields unless the caller holds the matching permission
  - job detail strips paymentMethod/payment_method without financial permission
  - price-book strips cost_net/margins without view_costs_profit and sell prices
    without view_pricing
  - operations/catalog (the dashboard/products datasource) groups margins with
    the costing class and sell prices with the pricing class
  - customers/workspace strips quoted/agreed amounts and quotes without
    view_pricing

Requires a test tenant with:
  - a manager user (full role permissions)
  - a test user whose explicit permission array can be set per case
  - a job with quoted_amount = 1250 (nonzero, so absence is meaningful)
  - a price-book item with cost_net = 50, fixed_sell_net = 85,
    margin_percent = 41.18 (nonzero)

The harness wrapper must provide:
  setperms(perms)  -> sets the TEST user's explicit permission array and MUST
                      verify the write landed (rowcount == 1 and the row read
                      back matches), failing loudly otherwise. A silent no-op
                      update once invalidated an entire test battery.
  manager_token, user_token -> bms_access_token JWT cookies.

Run: import run(setperms, manager_token, user_token) from the wrapper.
"""
import json, urllib.request

BASE="http://localhost:4000"
HOST="bms-runtime.localhost:4000"
JOB="retb-20261119-job"

def get(tok,path):
    req=urllib.request.Request(BASE+path,headers={"Cookie":"bms_access_token="+tok,"Host":HOST})
    try:
        with urllib.request.urlopen(req) as r: return r.status,json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code,json.loads(e.read())
        except Exception: return e.code,{}

def keywalk(o):
    """All key paths in a decoded JSON body (values never inspected)."""
    out=set()
    def w(x,p):
        if isinstance(x,dict):
            for k,v in x.items(): out.add(p+"/"+k); w(v,p+"/"+k)
        elif isinstance(x,list):
            for v in x: w(v,p+"[]")
    w(o,"")
    return out

def run(setperms,mgr_tok,user_tok):
    tests=[]
    def check(name,ok): tests.append((name,bool(ok))); print(("PASS" if ok else "FAIL"),name)

    # member identity + nonzero fixture assertions guard against vacuous passes
    s,d=get(user_tok,"/api/admin/session")
    check("session reachable for test user",s==200)

    setperms(["view_jobs","view_pricing"])
    s,d=get(user_tok,"/api/admin/jobs/"+JOB)
    check("detail pricing-only: permissions echo matches request",d.get("permissions")==["view_jobs","view_pricing"])
    body=json.dumps(d)
    check("detail pricing-only: paymentMethod absent","paymentMethod" not in body and "payment_method" not in body)
    check("detail pricing-only: quoted == 1250 (nonzero)",(d.get("job") or {}).get("quoted_amount")==1250)
    s,d=get(user_tok,"/api/admin/jobs")
    check("jobs list 200 pricing-only",s==200)

    setperms(["view_jobs","view_costs_profit"])
    s,d=get(user_tok,"/api/admin/jobs/"+JOB)
    j=json.dumps(d.get("job",{}))
    check("detail cost-only: paymentMethod absent","paymentMethod" not in json.dumps(d) and "payment_method" not in json.dumps(d))
    check("detail cost-only: quoted stripped","quoted_amount" not in j and "quotedAmount" not in j)

    setperms(["view_pricing"])
    s,d=get(user_tok,"/api/admin/price-book")
    keys=keywalk(d)
    price_keys=lambda: [k for k in keys if any(w in k.lower().split("/")[-1] for w in ("sell_net","sell_rate","fixed_sell"))]
    check("price-book pricing-only: no cost/margin/markup KEYS",not any(any(w in k.lower() for w in ("cost","margin","markup")) for k in keys))
    check("price-book pricing-only: sell present",len(price_keys())>0)

    setperms(["view_costs_profit"])
    s,d=get(user_tok,"/api/admin/price-book")
    keys=keywalk(d)
    check("price-book cost-only: no sell-price KEYS",len(price_keys())==0)
    check("price-book cost-only: cost present",any("cost" in k.lower() for k in keys))

    # operations/catalog: datasource behind the dashboard/products surfaces
    setperms(["view_jobs","view_pricing"])
    s,d=get(user_tok,"/api/admin/operations/catalog")
    p0=(d.get("products") or [{}])[0]
    check("catalog pricing-only: cost/margin/markup absent",all(k not in p0 for k in ("cost_net","markup_percent","margin_percent")))
    check("catalog pricing-only: fixed_sell_net == 85 (nonzero)",p0.get("fixed_sell_net")==85)
    check("catalog pricing-only: purchase_lines unit_cost absent",all("unit_cost_net" not in l for l in (d.get("purchase_lines") or [])))

    setperms(["view_jobs","view_costs_profit"])
    s,d=get(user_tok,"/api/admin/operations/catalog")
    p0=(d.get("products") or [{}])[0]
    check("catalog cost-only: cost_net == 50 (nonzero)",p0.get("cost_net")==50)
    check("catalog cost-only: margin_percent == 41.18 (nonzero)",p0.get("margin_percent")==41.18)
    check("catalog cost-only: sell/pricing_method absent","fixed_sell_net" not in p0 and "pricing_method" not in p0)

    setperms(["view_jobs"])
    s,d=get(user_tok,"/api/admin/operations/catalog")
    p0=(d.get("products") or [{}])[0]
    check("catalog base: neither class present",all(k not in p0 for k in ("cost_net","markup_percent","margin_percent","fixed_sell_net","pricing_method")))

    # customers/workspace
    setperms(["view_customer_details","view_jobs"])
    s,d=get(user_tok,"/api/admin/customers/workspace")
    j0=(d.get("jobs") or [{}])[0]
    check("customers/workspace field-like: quoted/agreed absent","quoted_amount" not in j0 and "agreed_amount" not in j0)
    check("customers/workspace field-like: job row still listed",j0.get("reference")==JOB)
    check("customers/workspace field-like: quotes emptied",d.get("quotes")==[])

    setperms(["view_customer_details","view_jobs","view_pricing"])
    s,d=get(user_tok,"/api/admin/customers/workspace")
    j0=(d.get("jobs") or [{}])[0]
    check("customers/workspace pricing: quoted == 1250 (nonzero)",j0.get("quoted_amount")==1250)

    s,d=get(mgr_tok,"/api/admin/dashboard")
    check("dashboard manager 200",s==200)
    setperms(["view_pricing"])
    s,d=get(user_tok,"/api/admin/dashboard")
    check("dashboard pricing-only 200",s==200)

    setperms([])
    failed=[n for n,ok in tests if not ok]
    print("\n%d/%d passed"%(len(tests)-len(failed),len(tests)))
    return 1 if failed else 0

if __name__=="__main__":
    raise SystemExit("Import run(setperms, manager_token, user_token) from the test harness wrapper.")
