import type { Metadata, Viewport } from "next";
import { Fredoka, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-ui" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-mono" });
const logo = Fredoka({ subsets: ["latin"], weight: ["600"], variable: "--f-logo" });

export const metadata: Metadata = {
  title: "radar — ideias de SaaS em alta",
  description: "Em 1 minuto, as ideias de SaaS que estão bombando no seu nicho.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Aplica o tema salvo antes da primeira pintura (escuro é o padrão).
const TEMA = `(function(){try{var t=localStorage.getItem("tema");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
