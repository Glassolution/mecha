import type { Metadata, Viewport } from "next";
import { Fredoka, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-ui" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-mono" });
const logo = Fredoka({ subsets: ["latin"], weight: ["600"], variable: "--f-logo" });

export const metadata: Metadata = {
  title: "mecha — ideias de SaaS em alta",
  description: "Em 1 minuto, as ideias de SaaS que estão bombando no seu nicho.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// O site é só escuro: apaga a escolha antiga de tema claro, se existir.
const TEMA = `(function(){try{localStorage.removeItem("tema")}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${mono.variable} ${logo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
