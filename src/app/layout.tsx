import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mind & Hand Chess',
  description: '2v2 chess variant — Mind selects, Hand moves',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
