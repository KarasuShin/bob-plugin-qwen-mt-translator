import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import pkg from '../package.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function packDist() {
  const projectRoot = path.resolve(__dirname, '..')
  const distPath = path.join(projectRoot, 'dist')
  const outputPath = path.join(projectRoot, `qwen-mt-translator-${pkg.version}.bobplugin`)

  if (!fs.existsSync(distPath)) {
    console.error('❌ dist directory does not exist, please run build command first')
    process.exit(1)
  }

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath)
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip')
    output.on('close', () => {
      const sizeInKB = (archive.pointer() / 1024).toFixed(2)
      console.log(`✅ Packaging completed!`)
      console.log(`📁 Output file: ${outputPath}`)
      console.log(`📊 File size: ${sizeInKB} KB`)
      resolve()
    })

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ ', err)
      }
      else {
        reject(err)
      }
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    console.log('🔄 Compressing dist directory...')
    archive.directory(distPath, false)

    archive.finalize()
  })
}

packDist().catch((error) => {
  console.error('❌ Packaging failed:', error)
  process.exit(1)
})
