import './globals.css';

export const metadata = {
  title: 'Diamant Solutions | Websites & Business Solutions',
  description: 'Professional websites and bespoke business solutions built around your business.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
