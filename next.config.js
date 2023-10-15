const { truncate } = require('fs/promises')

/** @type {import('next').NextConfig} */
const withTM = require('next-transpile-modules')(['@square/web-sdk', 'react-square-web-payments-sdk'])

// https://www.youtube.com/watch?v=GNo9y1CRcZ4&ab_channel=SquareDeveloper
const nextConfig = {
  images: {
    domains: [
      'replicate.delivery',
      'pbxt.replicate.delivery',
      'aiapparel-s3stack-aiapparelbucket7dbbd1c7-1b3nybqrm38se.s3.amazonaws.com'
    ]
  },
  reactStrictMode: true,
  webpack: (config, {buildId, dev, isServer, defaultLoaders, webpack}) => {
    config.module.rules.push({
      test: /\.node$/,
      loader: "node-loader",
    })
    return config
  },
  swcMinify: true,
  experimental: {
    esmExternals: 'loose'
  }
}

module.exports = withTM(nextConfig)
