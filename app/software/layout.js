const title = 'Business Management Software | Diamant Solutions';
const description = 'Bespoke business management software built around your business. Manage customers, jobs, quotes, invoices and payments, with ongoing support included.';
const image = 'https://bms.diamantsolutions.co.uk/_next/image?url=%2Fbms-og.png&w=1200&q=80';

export const metadata = {
  title,
  description,
  alternates: { canonical: 'https://diamantsolutions.co.uk/software' },
  openGraph: {
    type: 'website',
    siteName: 'Diamant Solutions',
    title,
    description,
    url: 'https://diamantsolutions.co.uk/software',
    images: [{ url: image, width: 1200, height: 637, alt: 'Diamant Solutions Business Management Software' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

export default function SoftwareLayout({ children }) {
  return children;
}
