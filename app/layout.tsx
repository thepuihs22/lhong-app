import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Lhong Kung Share - หลงกุ้งแช่",
  description: "เด็ดแน่ แซ่บแท้ สูตรแม่ล้วน กุ้งแช่น้ำปลาที่จริงใจพร้อมเสิร์ฟแล้ว😋",
  keywords: "เด็ดแน่ แซ่บแท้ สูตรแม่ล้วน กุ้งแช่น้ำปลาที่จริงใจพร้อมเสิร์ฟแล้ว😋",
  authors: [{ name: 'Lhong Kung Share' }],
  creator: 'Lhong Kung Share',
  publisher: 'Lhong Kung Share',
  robots: 'index, follow',
  openGraph: {
    title: "Lhong Kung Share - หลงกุ้งแช่",
    description: 'เด็ดแน่ แซ่บแท้ สูตรแม่ล้วน กุ้งแช่น้ำปลาที่จริงใจพร้อมเสิร์ฟแล้ว😋',
    url: 'https://lhong-kung-share.com',
    siteName: 'Lhong Kung Share',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Lhong Kung Share - หลงกุ้งแช่",
    description: 'เด็ดแน่ แซ่บแท้ สูตรแม่ล้วน กุ้งแช่น้ำปลาที่จริงใจพร้อมเสิร์ฟแล้ว😋',
    images: ['/images/lhong-kung-share.jpg'],
    creator: '@lhongkungshare',
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
