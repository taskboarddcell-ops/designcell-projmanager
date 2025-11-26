import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DCell Project Manager",
  description: "Project management system for DCell",
  icons: {
    icon: [
      {
        url: "https://designcell.com.np/wp-content/themes/WPSTARTER/imagio_s/img/logo/logo.png",
        sizes: "any",
      },
      {
        url: "/favicon.ico",
        sizes: "any",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "https://designcell.com.np/wp-content/themes/WPSTARTER/imagio_s/img/logo/logo.png",
        sizes: "180x180",
      },
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
