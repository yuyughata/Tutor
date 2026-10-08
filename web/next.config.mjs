/** Static export: the whole site is plain files you can host anywhere (Netlify, Cloudflare Pages, Vercel, S3...). */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
