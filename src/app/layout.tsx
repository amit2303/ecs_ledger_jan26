import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HeaderActions } from '@/components/HeaderActions'
import { GlobalHeader } from '@/components/GlobalHeader'

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "ECS Ledger",
  description: "ECS Client & Vendor Ledger",
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100 h-screen text-gray-900 font-sans antialiased selection:bg-blue-100 overflow-hidden">
        <main className="w-full h-full mx-auto bg-white shadow-xl flex flex-col relative md:max-w-md lg:max-w-lg xl:max-w-xl overflow-hidden">
          <GlobalHeader />
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
