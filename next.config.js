/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['replicate.delivery']
  },
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
