import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/contexts/SocketContext";
import { DownloadProvider } from "@/contexts/DownloadContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sharbee - Local File Transfer & Chat",
  description: "Transfer files and chat over local WiFi network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DownloadProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </DownloadProvider>
      </body>
    </html>
  );
}
