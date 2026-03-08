module.exports = {
  host: '127.0.0.1',
  port: 4173,
  basePath: '/imaginizim/',
  reportsDir: 'performance-reports/lighthouse',
  routes: [
    { name: 'home', hash: '#/' },
    { name: 'how', hash: '#/como-funciona' },
    { name: 'formats', hash: '#/formatos' },
    { name: 'privacy', hash: '#/privacidade' },
    { name: 'faq', hash: '#/faq' },
    { name: 'about', hash: '#/sobre' }
  ],
  thresholds: {
    performance: 0.95,
    accessibility: 1,
    'best-practices': 1,
    seo: 1
  }
};
