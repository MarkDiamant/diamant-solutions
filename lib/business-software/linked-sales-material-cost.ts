type Allocation={id:string;quantity:unknown;unit_cost_net:unknown};
type CostReturn={original_allocation_id:string;quantity:unknown;unit_cost_net:unknown};
export function linkedSalesMaterialCost(allocations:Allocation[],returns:CostReturn[]){
 const ids=new Set<string>(),returned=new Map<string,number>();let picked=0,restocked=0;
 for(const a of allocations){const qty=Number(a.quantity),cost=Number(a.unit_cost_net);if(!a.id||ids.has(a.id)||!Number.isFinite(qty)||qty<=0||a.unit_cost_net===null||!Number.isFinite(cost)||cost<0)throw Error("Invalid linked sales cost allocation");ids.add(a.id);picked+=qty*cost;}
 for(const r of returns){const allocation=allocations.find(a=>a.id===r.original_allocation_id),qty=Number(r.quantity),cost=Number(r.unit_cost_net);if(!allocation||!Number.isFinite(qty)||qty<=0||r.unit_cost_net===null||!Number.isFinite(cost)||cost<0||cost!==Number(allocation.unit_cost_net))throw Error("Invalid linked sales return cost");const total=(returned.get(allocation.id)||0)+qty;if(total-Number(allocation.quantity)>0.000001)throw Error("Linked sales returns exceed picked quantity");returned.set(allocation.id,total);restocked+=qty*cost;}
 return {picked_net:picked,restocked_net:restocked,net:Math.max(0,picked-restocked),allocation_count:allocations.length};
}
