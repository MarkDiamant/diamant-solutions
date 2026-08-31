import './globals.css';

export const metadata = {
  title: 'Diamant Solutions | Websites & Business Solutions',
  description: 'Professional websites and bespoke business solutions built around your business.',
  icons: { icon: '/DS Logo latest tagline.png', shortcut: '/DS Logo latest tagline.png', apple: '/DS Logo latest tagline.png' },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
