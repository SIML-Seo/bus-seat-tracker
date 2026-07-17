/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://bus-seat-tracker.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://bus-seat-tracker.vercel.app/sitemap.xml',
    ],
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  changefreq: 'daily',
  priority: 0.7,
  exclude: ['/api/*'],
} 