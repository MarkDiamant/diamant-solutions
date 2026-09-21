import './globals.css';
import './refinements.css';
import Refinements from './refinements';
import WorkCarousel from './work-carousel';

export const metadata = {
  title: 'Diamant Solutions | Business Software, Websites & Business Advisory',
  description: 'Business management software, professional websites and practical Business Advisory, built around the way your business works.',
  icons: {
    icon: '/Icon-512.png',
    shortcut: '/Icon-512.png',
    apple: '/Icon-512.png',
  },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Refinements/><WorkCarousel/></body></html>;
}
