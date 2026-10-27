export type InvoiceEmailFacts={invoiceNumber:string;customerFirstName?:string;businessName:string;senderName?:string;total:number;amountPaid:number;amountDue:number;dueDate?:string|null;status?:string;paymentVerified?:boolean;depositPercent?:number;paymentTerms?:string};
const gbp=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
export function invoiceEmailBody(f:InvoiceEmailFacts,now=new Date()):string{
 const {total,amountPaid,amountDue}=f;if(![total,amountPaid,amountDue].every(n=>Number.isFinite(n)&&n>=0))throw new Error("Invoice balances are not verified");
 const name=String(f.customerFirstName||"there").trim(),number=String(f.invoiceNumber).trim(),business=String(f.businessName).trim();
 const due=typeof f.dueDate==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)?f.dueDate:null;
 const today=now.toISOString().slice(0,10),overdue=!!due&&due<today&&amountDue>0;
 let request="";
 if(f.paymentVerified===false)request="Please check the invoice for the current balance. Any payments awaiting verification have not been confirmed in this message.";
 else if(amountDue<=0.005)request="Thank you, your invoice has been paid in full. No further payment is required.";
 else if(amountPaid>0.005){request="Thank you for your "+(amountPaid<total?"payment of ":"payments totalling ")+gbp(amountPaid)+". The remaining balance of "+gbp(amountDue)+(overdue?" is overdue. Please arrange payment as soon as possible.":" is now due.");}
 else if(overdue)request="The outstanding balance of "+gbp(amountDue)+" was due on "+new Date(due+"T12:00:00Z").toLocaleDateString("en-GB")+". Please arrange payment as soon as possible.";
 else if((f.depositPercent||0)>0&&(f.depositPercent||0)<100&&Math.abs(amountDue-total)<0.01)request="To get started, please arrange the agreed "+f.depositPercent+"% deposit of "+gbp(Math.round(total*f.depositPercent)/100)+". The remaining balance is payable according to your agreed terms.";
 else request="The outstanding balance of "+gbp(amountDue)+(due?" is due on "+new Date(due+"T12:00:00Z").toLocaleDateString("en-GB")+".":" is now due.");
 return ["Hi "+name+",","Please find attached your invoice "+number+".",request,"Thank you very much for your business, we really appreciate it. If you have any questions, please feel free to get in touch.","Kind regards,\n"+(f.senderName?f.senderName+"\n":"")+business].join("\n\n");
}
