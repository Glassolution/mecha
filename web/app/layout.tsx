import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-ui" });
const mono =IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "Wae — ideias de SaaS em alta",
  description: "Em 1 minuto, as ideias de SaaS que estão bombando no seu nicho.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// A identidade da Wae usa uma base clara.
const TEMA = `(function(){try{localStorage.removeItem("tema")}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
