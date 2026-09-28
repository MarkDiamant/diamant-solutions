const title = 'Professional Websites | Diamant Solutions';
const description = 'Professional websites built around your business. From £29/month, with hosting and ongoing support included.';
const image = 'https://diamantsolutions.co.uk/_next/image?url=%2Fweb-og.png&w=1200&q=80';

export const metadata = {
  title,
  description,
  alternates: { canonical: 'https://diamantsolutions.co.uk/websites' },
  openGraph: {
    type: 'website',
    siteName: 'Diamant Solutions',
    title,
    description,
    url: 'https://diamantsolutions.co.uk/websites',
    images: [{ url: image, width: 1200, height: 629, type: 'image/png', alt: 'Diamant Solutions professional websites, built around your business. From £29/month with hosting and support included.' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

export default function WebsitesLayout({ children }) {
  return children;
}
