"use client";
import { useEffect, useState } from "react";
import { DEFAULT_CRM_CONFIG, type CrmConfig } from "@/lib/crm/config";

export default function IntegrationsPage() {
 return <main className="min-h-screen bg-[#f5f5f2] p-6 lg:p-10"><div className="mx-auto max-w-4xl"><h1 className="text-3xl font-black">Integrations</h1><p className="mt-2 text-sm text-black/55">Connect external services used by your business.</p><div className="mt-6 grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Xero</h2><p className="mt-2 text-sm text-black/55">Accounting integration is configured per client by Diamant Solutions. Once connected, invoice actions appear on each job.</p></section><section className="rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Google / Gmail</h2><p className="mt-2 text-sm text-black/55">Email integration is configured per client by Diamant Solutions. Quote and invoice email actions become available after connection.</p></section></div></div></main>;
}
