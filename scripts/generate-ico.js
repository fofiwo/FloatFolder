const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/** 生成 Windows 图标文件 (.ico) */
async function generateIco() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  // 从 SVG 生成各个尺寸的 PNG
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: pngBuffer });
  }

  // 构建 ICO 文件头
  const numImages = pngBuffers.length;
  const headerSize = 6 + numImages * 16;
  const dataOffset = headerSize;

  // ICO 文件头
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: ICO
  header.writeUInt16LE(numImages, 4); // Count

  let currentOffset = dataOffset;
  const imageData = [];

  // 写入 ICONDIRENTRY
  for (let i = 0; i < pngBuffers.length; i++) {
    const { size, buffer } = pngBuffers[i];
    const entryOffset = 6 + i * 16;

    header.writeUInt8(size === 256 ? 0 : size, entryOffset); // Width
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1); // Height
    header.writeUInt8(0, entryOffset + 2); // Color palette
    header.writeUInt8(0, entryOffset + 3); // Reserved
    header.writeUInt16LE(1, entryOffset + 4); // Color planes
    header.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
    header.writeUInt32LE(buffer.length, entryOffset + 8); // Size
    header.writeUInt32LE(currentOffset, entryOffset + 12); // Offset

    imageData.push(buffer);
    currentOffset += buffer.length;
  }

  // 合并所有数据
  const icoBuffer = Buffer.concat([header, ...imageData]);

  // 写入文件
  const icoPath = path.join(__dirname, '../public/icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Generated icon.ico successfully!');
}

generateIco().catch(console.error);
