import { createGmailMessage } from "@/lib/business-software/gmail-send";
export async function POST(request,ctx){return createGmailMessage(request,ctx,true)}
