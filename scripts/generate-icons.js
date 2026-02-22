/**
 * 从 SVG 生成多尺寸 PNG 图标
 * 用于 Electron 窗口图标、系统托盘图标、打包图标
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const SVG_PATH = path.join(__dirname, '../public/icon.svg')
const OUTPUT_DIR = path.join(__dirname, '../public')

const sizes = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-48.png', size: 48 },
  { name: 'icon-64.png', size: 64 },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-256.png', size: 256 },
  { name: 'icon.png', size: 256 }
]

async function generate() {
  const svgBuffer = fs.readFileSync(SVG_PATH)

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(OUTPUT_DIR, name))
    console.log(`✓ ${name} (${size}x${size})`)
  }

  console.log('\n图标生成完成！')
}

generate().catch((err) => {
  console.error('图标生成失败:', err)
  process.exit(1)
})
