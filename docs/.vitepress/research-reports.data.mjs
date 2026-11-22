import { loadReports } from './research-reports.mjs'

export default {
  watch: [
    '../public/html/report-*/index.html',
    '../public/html/report-*/blog-meta.json',
    '../public/html/report-*/assets/report.css',
  ],
  load() {
    return loadReports()
  },
}
