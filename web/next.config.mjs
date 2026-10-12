/**
 * Static export: the whole site is plain files you can host anywhere (Netlify, Cloudflare Pages, Vercel, S3, cPanel...).
 * To host it in a folder instead of the root of a domain (for example www.custar.ng/Genova), build with
 *   NEXT_PUBLIC_BASE_PATH=/Genova npm run build
 * and upload the contents of `out/` into that folder.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
};
export default nextConfig;
