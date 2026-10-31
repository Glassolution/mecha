import type { NextConfig } from "next";

// O site nunca fala com a Apify nem guarda chave: todo /api/* vai para o nosso servidor (pasta api/).
const API = process.env.RADAR_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
  images: { unoptimized: true },
  // a primeira análise de um vídeo busca comentários e pesquisa na web: pode levar até ~3 minutos (padrão: 30 s)
  experimental: { proxyTimeout: 240_000 },
};

export default nextConfig;
