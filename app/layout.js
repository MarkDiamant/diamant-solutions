import './globals.css';

export const metadata = {
  title: 'Diamant Solutions | Websites & Business Solutions',
  description: 'Professional websites and bespoke business solutions built around your business.',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
