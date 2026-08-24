// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/huzni-sfamily' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/huzni-sfamily/' : '',
}

module.exports = nextConfig
