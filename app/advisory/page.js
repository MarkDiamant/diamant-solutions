import './advisory.css';
import './pricing.css';
import AdvisoryClient from './AdvisoryClient';

export const metadata={
  title:'Business Advisory | Diamant Solutions',
  description:'Practical one-to-one business advisory with Mark Diamant. Clear decisions, stronger priorities and practical implementation support for business owners.',
  alternates: { canonical: 'https://diamantsolutions.co.uk/advisory' },
  openGraph: {
    type: 'website',
    siteName: 'Diamant Solutions',
    title: 'Business Advisory | Diamant Solutions',
    description: 'Practical one-to-one support for business owners. Clear decisions, practical action and accountability. Decide. Then implement.',
    url: 'https://diamantsolutions.co.uk/advisory',
    images: [{ url: 'https://diamantsolutions.co.uk/advisory-og.png?v=1', width: 1732, height: 908, type: 'image/png', alt: 'Diamant Solutions Business Advisory. Decide. Then implement. Direction, profitability, systems and implementation.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Advisory | Diamant Solutions',
    description: 'Practical one-to-one support for business owners. Clear decisions, practical action and accountability. Decide. Then implement.',
    images: ['https://diamantsolutions.co.uk/advisory-og.png?v=1'],
  },
};

export default function Advisory(){return <AdvisoryClient/>;}
