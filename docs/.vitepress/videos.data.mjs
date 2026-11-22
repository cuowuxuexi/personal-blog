import { loadVideos } from './videos.mjs'

export default {
  watch: ['../视频/videos.json'],
  load() {
    return loadVideos()
  },
}
