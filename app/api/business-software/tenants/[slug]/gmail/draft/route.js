import { createGmailMessage } from "../send/route";
export async function POST(request,ctx){return createGmailMessage(request,ctx,true)}
