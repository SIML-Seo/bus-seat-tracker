import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 의미 토큰 (값은 app/globals.css, 다크 모드는 토큰 값만 바뀐다)
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        subtle: "var(--subtle)",
        sunken: "var(--sunken)",
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: {
          DEFAULT: "var(--accent)",
          strong: "var(--accent-strong)",
          soft: "var(--accent-soft)",
          muted: "var(--accent-muted)",
          ink: "var(--accent-ink)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
          line: "var(--danger-line)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
          line: "var(--warning-line)",
        },
        success: "var(--success)",
        // 직행좌석(빨간 버스) 노선 색
        route: {
          DEFAULT: "var(--route)",
          ink: "var(--route-ink)",
        },
        // 전광판(BIS) 톤
        led: {
          bg: "var(--led-bg)",
          DEFAULT: "var(--led)",
          dim: "var(--led-dim)",
        },
        // 잔여석 등급 (여유/보통/적음/거의 없음)
        seat: {
          plenty: "var(--seat-plenty)",
          ok: "var(--seat-ok)",
          low: "var(--seat-low)",
          crit: "var(--seat-crit)",
          none: "var(--seat-none)",
          "plenty-ink": "var(--seat-plenty-ink)",
          "low-ink": "var(--seat-low-ink)",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        dot: ["var(--font-dot)", "var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
