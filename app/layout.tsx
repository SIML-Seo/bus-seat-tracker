import type { Metadata, Viewport } from "next";
import { DotGothic16, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

// 본문 글꼴 Pretendard는 Google Fonts에 없어 공식 CDN의 dynamic subset을 쓴다.
// 한글을 92개 unicode-range 조각으로 나눠 화면에 쓰인 글자 조각만 받는다. (전체 파일 약 2MB를 받지 않도록)
// 버전을 고정해 CDN 쪽 변경이 화면에 섞이지 않게 한다.
const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// 숫자·데이터 표기용. 일부 화면에서만 쓰므로 preload하지 않는다.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// 노선 상세의 전광판(BIS) 요약 전용 도트 폰트. 상세 화면에서만 쓰므로 preload하지 않는다.
const dotGothic = DotGothic16({
  variable: "--font-dot",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "좌석 버스 잔여석 통계",
  description: "좌석 버스 번호를 검색하여 시간대별 정류장 잔여석을 확인하세요. 평일/주말 통계 및 실시간 데이터 제공.",
  keywords: "좌석버스, 잔여석, 버스좌석, 시간표, 통계, 정류장, 대중교통",
  openGraph: {
    title: "좌석 버스 잔여석 통계",
    description: "좌석 버스 번호를 검색하여 시간대별 정류장 잔여석을 확인하세요. 평일/주말 통계 및 실시간 데이터 제공.",
    url: "https://bus-seat-tracker.vercel.app/",
    siteName: "좌석 버스 잔여석 통계",
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "좌석 버스 잔여석 통계",
  metadataBase: new URL("https://bus-seat-tracker.vercel.app"),
};

// Next.js 14부터 viewport는 metadata가 아닌 별도 export로 선언한다. (metadata 안에 두면 모든 요청에서 경고)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRETENDARD_CSS} crossOrigin="anonymous" />
      </head>
      <body
        className={`${plexMono.variable} ${dotGothic.variable} font-sans antialiased`}
      >
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-V8BPEY011T"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-V8BPEY011T');
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
