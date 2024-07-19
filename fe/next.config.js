/** @type {import('next').NextConfig} */
const nextConfig = {
  // webpack5: true,
  // webpack: (config) => {
  //   config.resolve.fallback = { fs: false, tls: false };
  //   config.cache = false;
  //   return config;
  // },
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    // Important: return the modified config
    return config
  },
  module: {
    rules: [
      { test: /face-api.esm.js/, type: 'javascript/esm' },
    ],
  },
  reactStrictMode: true,
};
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   webpack: (config, { isServer }) => {
//     // Fixes npm packages that depend on `fs` module
//     if (!isServer) {
//       config.node = {
//         fs: 'empty'
//       };
//       config.resolve.alias['@vladmandic/face-api'] = '@vladmandic/face-api/dist/face-api.js';
//     }

//     // Add rule for handling face-api.esm.js
//     config.module.rules.push({
//       test: /face-api.esm.js/,
//       type: 'javascript/esm'
//     });

//     return config;
//   },
//   reactStrictMode: true,
// };

module.exports = nextConfig;
