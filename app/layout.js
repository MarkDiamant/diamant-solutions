import './globals.css';
import './refinements.css';

export const metadata = {
  title: 'Diamant Solutions | Websites & Business Solutions',
  description: 'Professional websites and bespoke business solutions built around your business.',
  icons: {
    icon: '/Icon-512.png',
    shortcut: '/Icon-512.png',
    apple: '/Icon-512.png',
  },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
