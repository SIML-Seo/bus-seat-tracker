/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://busseatstracker.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://busseatstracker.vercel.app/sitemap.xml',
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