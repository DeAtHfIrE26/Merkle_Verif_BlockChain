/**
 * The app has no server-side features: every route is prerendered and all
 * computation happens in the browser. That means it can ship either as a
 * normal Next.js deployment (Vercel) or as a fully static bundle (GitHub
 * Pages, any object store, any CDN).
 *
 * Set STATIC_EXPORT=true to produce the static bundle in `out/`. For a GitHub
 * Pages project site the app is served from a subpath, so PAGES_BASE_PATH
 * carries that prefix; leave it unset when serving from a domain root.
 */
const isStaticExport = process.env.STATIC_EXPORT === 'true';
const basePath = process.env.PAGES_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The shared crypto package ships TypeScript-built ESM; let Next compile it
  // as part of the app so it tree-shakes with everything else.
  transpilePackages: ['@merkle-verify/core'],

  ...(isStaticExport
    ? {
        output: 'export',
        // Static hosts cannot run the image optimizer. No next/image is used
        // here — every graphic is inline SVG — but this keeps export honest.
        images: { unoptimized: true },
        // Pages serves /about as /about/index.html.
        trailingSlash: true,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {
        // Security headers are applied by the host at request time, which a
        // static export has no way to do; they are set in vercel.json too.
        async headers() {
          return [
            {
              source: '/:path*',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Frame-Options', value: 'DENY' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
