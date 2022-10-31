/** @type {import('next').NextConfig} */
const withTM = require('next-transpile-modules')(['@square/web-sdk', 'react-square-web-payments-sdk'])

// https://www.youtube.com/watch?v=GNo9y1CRcZ4&ab_channel=SquareDeveloper
const nextConfig = {
  images: {
    domains: ['replicate.delivery']
  },
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: 'loose'
  }
}

module.exports = withTM(nextConfig)
