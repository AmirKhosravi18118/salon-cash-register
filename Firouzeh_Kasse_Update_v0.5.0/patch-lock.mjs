import fs from 'node:fs'

const filename = process.argv[2]
if (!filename || !fs.existsSync(filename)) process.exit(0)

const source = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')
const lock = JSON.parse(source)
lock.version = '0.5.0-test'

if (lock.packages?.['']) {
  lock.packages[''].version = '0.5.0-test'
}

fs.writeFileSync(filename, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
console.log('[OK] package-lock.json version updated to 0.5.0-test')
