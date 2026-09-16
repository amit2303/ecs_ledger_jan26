import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HeaderActions } from '@/components/HeaderActions'
import { GlobalHeader } from '@/components/GlobalHeader'

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ECS Ledger",
  description: "ECS Client & Vendor Ledger",
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ECS Ledger",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="fixed inset-0 w-full h-full text-gray-900 font-sans antialiased overflow-hidden" style={{ backgroundColor: '#F2F2F7' }}>
        <main className="w-full h-full mx-auto bg-ios-gray6 flex flex-col relative md:max-w-md lg:max-w-lg xl:max-w-xl overflow-hidden" style={{ backgroundColor: '#F2F2F7' }}>
          <GlobalHeader />
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
