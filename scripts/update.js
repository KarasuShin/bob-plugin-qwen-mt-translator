import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import pkg from '../package.json' with { type: 'json' }

const version = pkg.version
const desc = process.argv[2]

if (!desc) {
  throw new Error('Usage: node update_appcast.js <description>')
}

updateAppcast(version, desc)

function updateAppcast(version, desc) {
  const releaseFilePath = `qwen-mt-translator-${version}.bobplugin`

  if (!fs.existsSync(releaseFilePath)) {
    throw new Error(`Release file not found: ${releaseFilePath}`)
  }

  const fileContent = fs.readFileSync(releaseFilePath)
  const hash = crypto.createHash('sha256').update(fileContent).digest('hex')

  const versionInfo = {
    version,
    desc,
    sha256: hash,
    url: `https://github.com/karasushin/bob-plugin-qwen-mt-translator/releases/download/v${version}/${path.basename(releaseFilePath)}`,
    minBobVersion: '1.8.0',
  }

  const appcastFilePath = path.join('appcast.json')

  let appcast
  if (fs.existsSync(appcastFilePath)) {
    const appcastContent = fs.readFileSync(appcastFilePath, 'utf8')
    appcast = JSON.parse(appcastContent)
  }
  else {
    appcast = {
      identifier: 'karasu.qwen-mt.translator',
      versions: [],
    }
  }

  appcast.versions.unshift(versionInfo)

  fs.writeFileSync(appcastFilePath, JSON.stringify(appcast, null, 2), 'utf8')
}

console.log(`Appcast updated successfully for version ${version}`)
