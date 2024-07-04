/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
        if (!isServer) {
          config.resolve.alias['@vladmandic/face-api'] = '@vladmandic/face-api/dist/face-api.js';
        }
        return config;
      },
  reactStrictMode: true,
};

module.exports = nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   webpack: (config, { isServer }) => {
//     if (!isServer) {
//       config.resolve.fallback = {
//         ...config.resolve.fallback,
//         '@vladmandic/face-api': require.resolve('@vladmandic/face-api/dist/face-api.js/'),
//       };
//     }
//     return config;
//   },
//   reactStrictMode: true,
// };
// module.exports = nextConfig;

// // const path = require('path');

// // module.exports = {
// //   webpack: (config, { isServer }) => {
// //     if (!isServer) {
// //       config.resolve.alias['@vladmandic/face-api'] = '@vladmandic/face-api/dist/face-api.js';
// //     }
// //     return config;
// //   },
// //   reactStrictMode: true,
// // };

