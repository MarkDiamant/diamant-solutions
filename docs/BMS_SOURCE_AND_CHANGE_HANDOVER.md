# BMS source code and change handover (12 October 2026)

Repository: MarkDiamant/diamant-solutions, default branch main.
Vercel project: diamant-solutions, project ID prj_NeXx3jHox2oyr14nzUAxogtVqjDp, team ID team_pnXM49OpKfjmDidelNwJzcZ6.
Do NOT assume the BMS is in a separate repository. The BMS UI is under business-software-core/components/admin and app/bms-runtime; the BMS live API is app/api/bms-live/[...path]/route.ts. Demo API is app/api/bms-demo/[...path]/route.ts.

Key paths:
- business-software-core/components/admin/QuotePrint.tsx: customer-facing quote print page, WhatsApp sharing, email sending.
- business-software-core/components/admin/QuotePdfActions.tsx: quote PDF export and native share; event quote-whatsapp-shared.
- business-software-core/components/admin/JobDetail.tsx: job details.
- business-software-core/components/admin/JobWorkflowPanel.tsx: job workflow.
- app/bms-runtime/ai/page.tsx: Ruby voice recording, transcription and chat interface.
- app/api/bms-live/[...path]/route.ts: live quote/email endpoints, job patching, Ruby action execution and Ruby system instructions.

Changes committed 12 October 2026:
- Ruby transcription appends to current typed prompt: 14d3136c10972c73c065c3004775bfa2fcfea056.
- WhatsApp greeting based on customer, copied-message notification, share event handling: 269a587aa97425304ebeda6b5d4e91fe1be0280d.
- Native WhatsApp share completion event: 150d7ed42a7e7d4abc14ce0b4dfcbb6a38fbe2f7.
- Live API share-quote endpoint, quote sent workflow with 3-day follow-up, Gmail quote send workflow, Ruby instruction to preserve original description on corrections: 4780f00f519ad0c9f76e9449b647e37722231d1d.
- Manual PDF download WhatsApp confirmation before marking quote sent: b848075da536ad8888fbae61bd6169867b3ae877.

IMPORTANT: A successful GitHub commit does not prove live functionality. Always check latest production deployment READY and production alias and, where possible, end-to-end behaviour. At handover the deployment for b848075 was READY. A newer deployment for 150d7ed showed ERROR; investigate whether that failed deployment affects production. Avoid claiming a WhatsApp send is confirmed merely because a user clicked share: native share completion or manual user confirmation is used. Ruby description correction is prompt-level guidance, not yet verified in a live conversation. 
