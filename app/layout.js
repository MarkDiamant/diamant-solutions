import './globals.css';
import './refinements.css';
import Refinements from './refinements';
import WorkCarousel from './work-carousel';

export const metadata = {
  title: 'Diamant Solutions | Websites, CRM Systems & Business Solutions',
  description: 'Professional websites, custom CRM systems and practical business solutions built around the way your business works.',
  icons: {
    icon: '/Icon-512.png',
    shortcut: '/Icon-512.png',
    apple: '/Icon-512.png',
  },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Refinements/><WorkCarousel/></body></html>;
}
