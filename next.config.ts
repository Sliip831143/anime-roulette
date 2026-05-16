import type { NextConfig } from "next";

// 開発時に同一LAN内の別端末（スマホ・別Mac等）からアクセスする場合に許可する Origin。
// .env.local の ALLOWED_DEV_ORIGINS にカンマ区切りで指定（例: "192.168.1.7,192.168.1.8"）。
// 未指定なら何も追加しない。
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins && allowedDevOrigins.length > 0
    ? { allowedDevOrigins }
    : {}),
};

export default nextConfig;
