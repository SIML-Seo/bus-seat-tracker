import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "좌석 버스 잔여석 통계",
  description: "좌석 버스 번호를 검색하여 시간대별 정류장 잔여석을 확인하세요. 평일/주말 통계 및 실시간 데이터 제공.",
  keywords: "좌석버스, 잔여석, 버스좌석, 시간표, 통계, 정류장, 대중교통",
  openGraph: {
    title: "좌석 버스 잔여석 통계",
    description: "좌석 버스 번호를 검색하여 시간대별 정류장 잔여석을 확인하세요. 평일/주말 통계 및 실시간 데이터 제공.",
    url: "https://busseatstracker.vercel.app/",
    siteName: "좌석 버스 잔여석 통계",
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  applicationName: "좌석 버스 잔여석 통계",
  metadataBase: new URL("https://busseatstracker.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
