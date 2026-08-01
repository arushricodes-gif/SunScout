/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Allow the popup opened for BlindSpot login to keep a
        // window.opener reference back to this tab and postMessage the
        // session through -- the default/stricter COOP value silently
        // breaks that handoff.
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
