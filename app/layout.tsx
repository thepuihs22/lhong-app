import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Lhong Restaurant - Authentic Thai Cuisine",
  description: "Experience the authentic flavors of Thailand at Lhong Restaurant. Fresh ingredients, traditional recipes, and exceptional service.",
  keywords: "restaurant, Thai food, authentic cuisine, Bangkok, dining",
  authors: [{ name: 'Lhong Restaurant' }],
  creator: 'Lhong Restaurant',
  publisher: 'Lhong Restaurant',
  robots: 'index, follow',
  openGraph: {
    title: "Lhong Restaurant - Authentic Thai Cuisine",
    description: 'Experience the authentic flavors of Thailand at Lhong Restaurant. Fresh ingredients, traditional recipes, and exceptional service.',
    url: 'https://lhong-restaurant.com',
    siteName: 'Lhong Restaurant',
    images: [
      {
        url: '/images/restaurant-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Lhong Restaurant - Authentic Thai Cuisine',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Lhong Restaurant - Authentic Thai Cuisine",
    description: 'Experience the authentic flavors of Thailand at Lhong Restaurant. Fresh ingredients, traditional recipes, and exceptional service.',
    images: ['/images/restaurant-hero.jpg'],
    creator: '@lhongrestaurant',
  },
  alternates: {
    canonical: 'https://lhong-restaurant.com',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
