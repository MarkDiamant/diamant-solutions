import QuotePrint from "@/components/admin/QuotePrint";
import QuotePdfActions from "@/components/admin/QuotePdfActions";

export default async function QuotePage({ params }: { params: Promise<{ reference: string; quoteId: string }> }) {
  const { reference, quoteId } = await params;
  const ref = reference.toUpperCase();
  return <><div className="mx-auto flex max-w-[900px] justify-end px-4 pt-3 print:hidden"><a href={`/admin/jobs/${encodeURIComponent(ref)}?tab=quote&quoteId=${encodeURIComponent(quoteId)}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Edit this quotation</a></div><QuotePrint reference={ref} quoteId={quoteId} /><QuotePdfActions reference={ref} quoteId={quoteId} /></>;
}
