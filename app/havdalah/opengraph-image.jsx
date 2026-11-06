export const runtime = 'edge';
export const alt = 'Havdalah Hotline | Hear Havdalah live over the phone';
export const size = { width: 1536, height: 865 };
export const contentType = 'image/png';

export default async function Image() {
  const response = await fetch('https://diamantsolutions.co.uk/havdalah-approved-og.png', { cache: 'no-store' });
  if (!response.ok) throw new Error('Approved Havdalah image unavailable');
  return new Response(response.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
