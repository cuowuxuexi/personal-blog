import fs from 'node:fs'
import path from 'node:path'

export function createJsonStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true })

  function read() {
    if (!fs.existsSync(file)) return {}
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      return {}
    }
  }

  function write(data) {
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    fs.renameSync(tmp, file)
  }

  return {
    file,
    get(id) {
      return read()[id] || null
    },
    set(id, value) {
      const data = read()
      data[id] = value
      write(data)
      return value
    },
    values() {
      return Object.values(read())
    },
  }
}
