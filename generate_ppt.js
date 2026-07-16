/**
 * 生成"近三年女性盆底功能障碍性疾病非手术治疗效果研究"PPT
 * 使用纯Node.js标准库（无需外部依赖）
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================
// ZIP 文件构建器
// ============================================================

class ZipBuilder {
  constructor() {
    this.entries = []; // { name, data: Buffer }
  }

  add(name, content) {
    this.entries.push({ name, data: Buffer.from(content, 'utf-8') });
  }

  build() {
    const bufs = [];
    const centralDir = [];
    let offset = 0;

    for (const entry of this.entries) {
      const raw = entry.data;
      const compressed = zlib.deflateRawSync(raw);
      const useCompression = compressed.length < raw.length;
      const data = useCompression ? compressed : raw;
      const crc = crc32(raw);

      // Local file header
      const nameBuf = Buffer.from(entry.name, 'utf-8');
      const localHeader = Buffer.alloc(30 + nameBuf.length);
      let pos = 0;
      localHeader.writeUInt32LE(0x04034b50, pos); pos += 4; // signature
      localHeader.writeUInt16LE(20, pos); pos += 2;         // version needed
      localHeader.writeUInt16LE(0x0800, pos); pos += 2;     // flags (UTF-8)
      localHeader.writeUInt16LE(useCompression ? 8 : 0, pos); pos += 2; // compression
      localHeader.writeUInt16LE(0, pos); pos += 2;          // mod time
      localHeader.writeUInt16LE(0, pos); pos += 2;          // mod date
      localHeader.writeUInt32LE(crc, pos); pos += 4;
      localHeader.writeUInt32LE(compressed.length, pos); pos += 4;
      localHeader.writeUInt32LE(raw.length, pos); pos += 4;
      localHeader.writeUInt16LE(nameBuf.length, pos); pos += 2;
      localHeader.writeUInt16LE(0, pos); pos += 2;          // extra length
      nameBuf.copy(localHeader, pos);

      bufs.push(localHeader);
      bufs.push(data);

      // Central directory entry
      const cdEntry = Buffer.alloc(46 + nameBuf.length);
      pos = 0;
      cdEntry.writeUInt32LE(0x02014b50, pos); pos += 4;
      cdEntry.writeUInt16LE(20, pos); pos += 2;             // version made by
      cdEntry.writeUInt16LE(20, pos); pos += 2;             // version needed
      cdEntry.writeUInt16LE(0x0800, pos); pos += 2;         // flags
      cdEntry.writeUInt16LE(useCompression ? 8 : 0, pos); pos += 2;
      cdEntry.writeUInt16LE(0, pos); pos += 2;              // mod time
      cdEntry.writeUInt16LE(0, pos); pos += 2;              // mod date
      cdEntry.writeUInt32LE(crc, pos); pos += 4;
      cdEntry.writeUInt32LE(compressed.length, pos); pos += 4;
      cdEntry.writeUInt32LE(raw.length, pos); pos += 4;
      cdEntry.writeUInt16LE(nameBuf.length, pos); pos += 2;
      cdEntry.writeUInt16LE(0, pos); pos += 2;              // extra length
      cdEntry.writeUInt16LE(0, pos); pos += 2;              // comment length
      cdEntry.writeUInt16LE(0, pos); pos += 2;              // disk start
      cdEntry.writeUInt16LE(0, pos); pos += 2;              // internal attrs
      cdEntry.writeUInt32LE(0, pos); pos += 4;              // external attrs
      cdEntry.writeUInt32LE(offset, pos); pos += 4;
      nameBuf.copy(cdEntry, pos);

      centralDir.push(cdEntry);
      offset += localHeader.length + data.length;
    }

    const cdStart = offset;
    for (const cd of centralDir) {
      bufs.push(cd);
      offset += cd.length;
    }

    // End of central directory
    const eocd = Buffer.alloc(22);
    let epos = 0;
    eocd.writeUInt32LE(0x06054b50, epos); epos += 4;
    eocd.writeUInt16LE(0, epos); epos += 2;                 // disk number
    eocd.writeUInt16LE(0, epos); epos += 2;                 // disk with CD
    eocd.writeUInt16LE(this.entries.length, epos); epos += 2;
    eocd.writeUInt16LE(this.entries.length, epos); epos += 2;
    eocd.writeUInt32LE(offset - cdStart, epos); epos += 4;  // CD size
    eocd.writeUInt32LE(cdStart, epos); epos += 4;
    eocd.writeUInt16LE(0, epos); epos += 2;
    bufs.push(eocd);

    return Buffer.concat(bufs);
  }
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xEDB88320;
      else crc >>>= 1;
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ============================================================
// XML 助手
// ============================================================

function xmlDecl() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tag(name, attrs, content, selfClose) {
  let s = '<' + name;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      s += ' ' + k + '="' + escapeXml(String(v)) + '"';
    }
  }
  if (selfClose) {
    s += '/>';
  } else if (content !== undefined) {
    s += '>' + content + '</' + name + '>';
  } else {
    s += '>';
  }
  return s;
}

function tagClose(name) {
  return '</' + name + '>';
}

// ============================================================
// 颜色方案
// ============================================================

const C = {
  PRIMARY: '1F4E79',
  ACCENT: '2E75B6',
  LIGHT: 'D6E4F0',
  WHITE: 'FFFFFF',
  BLACK: '333333',
  GRAY: '666666',
  GOLD: 'C5A33F',
};

// ============================================================
// 幻灯片尺寸 (16:9 EMU)
// ============================================================

const SW = 12192000;
const SH = 6858000;

function emu(cm) { return Math.round(cm * 360000); }

// ============================================================
// 形状构建器
// ============================================================

function rectShape(left, top, width, height, fillColor) {
  let s = '<p:sp>';
  s += '<p:nvSpPr><p:cNvPr id="0" name="rect"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>';
  s += '<p:spPr>';
  s += '<a:xfrm><a:off x="' + emu(left) + '" y="' + emu(top) + '"/>';
  s += '<a:ext cx="' + emu(width) + '" cy="' + emu(height) + '"/></a:xfrm>';
  s += '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  if (fillColor) {
    s += '<a:solidFill><a:srgbClr val="' + fillColor + '"/></a:solidFill>';
  } else {
    s += '<a:noFill/>';
  }
  s += '</p:spPr></p:sp>';
  return s;
}

function lineShape(left, top, width, color, thicknessPx) {
  const thickEmu = Math.round((thicknessPx || 2) * 12700);
  let s = '<p:sp>';
  s += '<p:nvSpPr><p:cNvPr id="0" name="line"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>';
  s += '<p:spPr>';
  s += '<a:xfrm><a:off x="' + emu(left) + '" y="' + emu(top) + '"/>';
  s += '<a:ext cx="' + emu(width) + '" cy="' + thickEmu + '"/></a:xfrm>';
  s += '<a:prstGeom prst="line"><a:avLst/></a:prstGeom>';
  s += '<a:ln w="' + thickEmu + '"><a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill></a:ln>';
  s += '</p:spPr></p:sp>';
  return s;
}

function textBox(left, top, width, height, paragraphs, shapeName) {
  // paragraphs: [{text, size, bold, color, align, font}]
  let s = '<p:sp>';
  s += '<p:nvSpPr><p:cNvPr id="0" name="' + (shapeName || 'tb') + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>';
  s += '<p:spPr>';
  s += '<a:xfrm><a:off x="' + emu(left) + '" y="' + emu(top) + '"/>';
  s += '<a:ext cx="' + emu(width) + '" cy="' + emu(height) + '"/></a:xfrm>';
  s += '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  s += '<a:noFill/></p:spPr>';
  s += '<p:txBody><a:bodyPr wrap="square"/>';

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const isLast = i === paragraphs.length - 1;
    const fontSize = p.size || 1600;
    const bold = p.bold ? '1' : '0';
    const color = p.color || C.BLACK;
    const align = p.align || 'l';
    const font = p.font || '微软雅黑';

    s += '<a:p><a:pPr algn="' + align + '"/>';
    s += '<a:r><a:rPr sz="' + fontSize + '" b="' + bold + '">';
    s += '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill>';
    s += '<a:latin typeface="' + font + '"/><a:ea typeface="' + font + '"/>';
    s += '</a:rPr><a:t>' + escapeXml(p.text) + '</a:t></a:r>';
    if (!isLast) s += '<a:endParaRPr lang="zh-CN"/>';
    s += '</a:p>';
  }

  s += '</p:txBody></p:sp>';
  return s;
}

// ============================================================
// 幻灯片构建器
// ============================================================

function buildSlide(shapesXml) {
  let s = xmlDecl();
  s += '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ';
  s += 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ';
  s += 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  s += '<p:cSld>';
  s += '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + C.WHITE + '"/></a:solidFill></p:bgPr></p:bg>';
  s += '<p:spTree>';
  s += shapesXml;
  s += '</p:spTree>';
  s += '</p:cSld>';
  s += '</p:sld>';
  return s;
}

function buildSlideRels() {
  // Most slides don't need external relationships
  let s = xmlDecl();
  s += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  s += '</Relationships>';
  return s;
}

// ============================================================
// 幻灯片模板
// ============================================================

function coverSlide() {
  let shapes = '';
  shapes += rectShape(0, 0, 33.87, 19.05, C.PRIMARY);
  shapes += lineShape(3, 8.8, 8, C.GOLD, 3);
  shapes += textBox(3, 5, 28, 3, [
    { text: '近三年女性盆底功能障碍性疾病', size: 3600, bold: true, color: C.WHITE, font: '微软雅黑' },
  ]);
  shapes += textBox(3, 7, 28, 2.5, [
    { text: '非手术治疗效果研究', size: 3600, bold: true, color: C.GOLD, font: '微软雅黑' },
  ]);
  shapes += textBox(3, 10.5, 28, 2, [
    { text: '—— 涉及民族、年龄、生活习惯与心理因素的多维度分析', size: 2000, bold: false, color: C.LIGHT, font: '微软雅黑' },
  ]);
  shapes += textBox(3, 14.5, 28, 1.5, [
    { text: '专业培训研讨会   ·   2026年7月', size: 1600, bold: false, color: C.LIGHT, font: '微软雅黑' },
  ]);
  return buildSlide(shapes);
}

function sectionSlide(title, subtitle) {
  let shapes = '';
  shapes += rectShape(0, 0, 15, 19.05, C.PRIMARY);
  shapes += rectShape(15, 0, 18.87, 19.05, C.WHITE);
  shapes += lineShape(3, 9, 3, C.GOLD, 3);
  shapes += textBox(3, 7.5, 10, 3, [
    { text: title, size: 3200, bold: true, color: C.WHITE, font: '微软雅黑' },
  ]);
  if (subtitle) {
    shapes += textBox(3, 10, 10, 2, [
      { text: subtitle, size: 1800, bold: false, color: C.LIGHT, font: '微软雅黑' },
    ]);
  }
  return buildSlide(shapes);
}

function contentSlideFull(title, items, note) {
  let shapes = '';
  shapes += rectShape(0, 0, 33.87, 2.8, C.PRIMARY);
  shapes += textBox(2, 0.3, 30, 2, [
    { text: title, size: 2800, bold: true, color: C.WHITE, font: '微软雅黑' },
  ]);
  shapes += lineShape(2, 2.9, 5, C.GOLD, 3);

  const yStart = 3.6;
  const lineH = 1.1;
  for (let i = 0; i < items.length; i++) {
    shapes += textBox(2.5, yStart + i * lineH, 29, lineH, [
      { text: items[i], size: 1400, bold: false, color: C.BLACK, font: '微软雅黑' },
    ]);
  }

  if (note) {
    shapes += textBox(2, 17, 30, 1.2, [
      { text: note, size: 1100, bold: false, color: C.GRAY, font: '微软雅黑' },
    ]);
  }
  shapes += rectShape(32, 18.5, 1.87, 0.55, C.ACCENT);
  return buildSlide(shapes);
}

function contentSlide(title, items, note) {
  let shapes = '';
  shapes += rectShape(0, 0, 33.87, 2.8, C.PRIMARY);
  shapes += textBox(2, 0.3, 30, 2, [
    { text: title, size: 2800, bold: true, color: C.WHITE, font: '微软雅黑' },
  ]);
  shapes += lineShape(2, 2.9, 5, C.GOLD, 3);

  const mid = Math.ceil(items.length / 2);
  const yStart = 3.8;
  const lineH = 1.15;

  for (let i = 0; i < mid; i++) {
    shapes += textBox(2, yStart + i * lineH, 14, lineH, [
      { text: '● ' + items[i], size: 1400, bold: false, color: C.BLACK, font: '微软雅黑' },
    ]);
  }
  for (let i = mid; i < items.length; i++) {
    shapes += textBox(17, yStart + (i - mid) * lineH, 15.5, lineH, [
      { text: '● ' + items[i], size: 1400, bold: false, color: C.BLACK, font: '微软雅黑' },
    ]);
  }

  if (note) {
    shapes += textBox(2, 17, 30, 1.2, [
      { text: note, size: 1100, bold: false, color: C.GRAY, font: '微软雅黑' },
    ]);
  }
  shapes += rectShape(32, 18.5, 1.87, 0.55, C.ACCENT);
  return buildSlide(shapes);
}

function tableSlide(title, headers, rows, note) {
  let shapes = '';
  shapes += rectShape(0, 0, 33.87, 2.8, C.PRIMARY);
  shapes += textBox(2, 0.3, 30, 2, [
    { text: title, size: 2200, bold: true, color: C.WHITE, font: '微软雅黑' },
  ]);
  shapes += lineShape(2, 2.9, 5, C.GOLD, 3);

  const ncols = headers.length;
  const colW = 29.5 / ncols;
  const rowH = 0.9;
  let y = 3.6;

  // 表头
  shapes += rectShape(2.2, y, 29.5, rowH, C.PRIMARY);
  for (let j = 0; j < ncols; j++) {
    const x = 2.2 + j * colW;
    shapes += textBox(x + 0.1, y + 0.05, colW - 0.2, rowH, [
      { text: headers[j], size: 1100, bold: true, color: C.WHITE, align: 'c', font: '微软雅黑' },
    ]);
  }

  // 数据行
  for (let i = 0; i < rows.length; i++) {
    y = 4.5 + i * rowH;
    const bgColor = i % 2 === 0 ? C.WHITE : C.LIGHT;
    shapes += rectShape(2.2, y, 29.5, rowH, bgColor);
    for (let j = 0; j < ncols; j++) {
      const x = 2.2 + j * colW;
      const cellText = rows[i][j] || '';
      shapes += textBox(x + 0.1, y + 0.05, colW - 0.2, rowH, [
        { text: cellText, size: 1000, bold: false, color: C.BLACK, align: 'c', font: '微软雅黑' },
      ]);
    }
  }

  if (note) {
    shapes += textBox(2, 17, 30, 1.2, [
      { text: note, size: 1000, bold: false, color: C.GRAY, font: '微软雅黑' },
    ]);
  }
  shapes += rectShape(32, 18.5, 1.87, 0.55, C.ACCENT);
  return buildSlide(shapes);
}

function endSlide() {
  let shapes = '';
  shapes += rectShape(0, 0, 33.87, 19.05, C.PRIMARY);
  shapes += lineShape(3, 8.5, 8, C.GOLD, 3);
  shapes += textBox(3, 6, 28, 3, [
    { text: '感谢聆听', size: 4400, bold: true, color: C.WHITE, font: '微软雅黑' },
  ]);
  shapes += textBox(3, 9.5, 28, 2, [
    { text: '欢迎提问与讨论', size: 2400, bold: false, color: C.LIGHT, font: '微软雅黑' },
  ]);
  shapes += textBox(3, 13, 28, 2, [
    { text: '关注女性盆底健康，从科学防治开始', size: 1800, bold: false, color: C.GOLD, font: '微软雅黑' },
  ]);
  return buildSlide(shapes);
}

// ============================================================
// PPTX 文件构建
// ============================================================

function buildPptx(slides) {
  const zip = new ZipBuilder();

  // [Content_Types].xml
  let ct = xmlDecl();
  ct += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
  ct += '<Default Extension="xml" ContentType="application/xml"/>';
  ct += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
  ct += '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>';
  ct += '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>';
  ct += '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>';
  ct += '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>';
  ct += '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>';
  ct += '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>';
  ct += '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>';
  for (let i = 0; i < slides.length; i++) {
    ct += '<Override PartName="/ppt/slides/slide' + (i+1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
  }
  ct += '</Types>';
  zip.add('[Content_Types].xml', ct);

  // _rels/.rels
  let rels = xmlDecl();
  rels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  rels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>';
  rels += '</Relationships>';
  zip.add('_rels/.rels', rels);

  // ppt/presentation.xml
  let pres = xmlDecl();
  pres += '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  pres += '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>';
  pres += '<p:sldIdLst>';
  for (let i = 0; i < slides.length; i++) {
    pres += '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>';
  }
  pres += '</p:sldIdLst>';
  pres += '<p:sldSz cx="' + SW + '" cy="' + SH + '" type="screen16x9"/>';
  pres += '<p:notesSz cx="6858000" cy="9144000"/>';
  pres += '</p:presentation>';
  zip.add('ppt/presentation.xml', pres);

  // ppt/_rels/presentation.xml.rels
  let prels = xmlDecl();
  prels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  prels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>';
  for (let i = 0; i < slides.length; i++) {
    prels += '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i+1) + '.xml"/>';
  }
  prels += '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>';
  prels += '<Relationship Id="rId101" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>';
  prels += '<Relationship Id="rId102" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>';
  prels += '<Relationship Id="rId103" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>';
  prels += '</Relationships>';
  zip.add('ppt/_rels/presentation.xml.rels', prels);

  // ppt/slideMasters/slideMaster1.xml
  let sm = xmlDecl();
  sm += '<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  sm += '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:sp/></p:spTree></p:cSld>';
  sm += '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>';
  sm += '</p:sldMaster>';
  zip.add('ppt/slideMasters/slideMaster1.xml', sm);

  // ppt/slideMasters/_rels/slideMaster1.xml.rels
  let smrels = xmlDecl();
  smrels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  smrels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>';
  smrels += '</Relationships>';
  zip.add('ppt/slideMasters/_rels/slideMaster1.xml.rels', smrels);

  // ppt/slideLayouts/slideLayout1.xml
  let sl = xmlDecl();
  sl += '<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="blank">';
  sl += '<p:cSld><p:spTree><p:sp/></p:spTree></p:cSld>';
  sl += '</p:sldLayout>';
  zip.add('ppt/slideLayouts/slideLayout1.xml', sl);

  // ppt/slideLayouts/_rels/slideLayout1.xml.rels
  let slrels = xmlDecl();
  slrels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  slrels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>';
  slrels += '</Relationships>';
  zip.add('ppt/slideLayouts/_rels/slideLayout1.xml.rels', slrels);

  // ppt/theme/theme1.xml
  let theme = xmlDecl();
  theme += '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Professional">';
  theme += '<a:themeElements>';
  theme += '<a:clrScheme name="Professional">';
  theme += '<a:dk1><a:srgbClr val="000000"/></a:dk1>';
  theme += '<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>';
  theme += '<a:dk2><a:srgbClr val="' + C.PRIMARY + '"/></a:dk2>';
  theme += '<a:lt2><a:srgbClr val="' + C.LIGHT + '"/></a:lt2>';
  theme += '<a:accent1><a:srgbClr val="' + C.ACCENT + '"/></a:accent1>';
  theme += '<a:accent2><a:srgbClr val="' + C.GOLD + '"/></a:accent2>';
  theme += '</a:clrScheme>';
  theme += '<a:fontScheme name="Professional">';
  theme += '<a:majorFont><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:majorFont>';
  theme += '<a:minorFont><a:latin typeface="微软雅黑"/><a:ea typeface="微软雅黑"/></a:minorFont>';
  theme += '</a:fontScheme>';
  theme += '<a:fmtScheme name="Professional"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme>';
  theme += '</a:themeElements>';
  theme += '</a:theme>';
  zip.add('ppt/theme/theme1.xml', theme);

  // 幻灯片
  for (let i = 0; i < slides.length; i++) {
    zip.add('ppt/slides/slide' + (i+1) + '.xml', slides[i]);
    zip.add('ppt/slides/_rels/slide' + (i+1) + '.xml.rels', buildSlideRels());
  }

  // 其他文件
  zip.add('ppt/presProps.xml', '<p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>');
  zip.add('ppt/viewProps.xml', '<p:viewPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>');
  zip.add('ppt/tableStyles.xml', '<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>');

  return zip.build();
}

// ============================================================
// 主程序
// ============================================================

function main() {
  const slides = [];

  // === 封面与目录 ===
  slides.push(coverSlide());

  slides.push(contentSlideFull('目  录', [
    '一、女性盆底功能障碍性疾病（PFD）概述',
    '二、流行病学特征 —— 民族差异分析',
    '三、年龄因素对PFD的影响',
    '四、生活习惯相关危险因素',
    '五、心理因素与PFD的双向关系',
    '六、非手术治疗方法体系总览',
    '七、盆底肌训练（PFMT）—— 一线治疗基石',
    '八、生物反馈与电刺激联合治疗',
    '九、磁刺激与物理治疗新技术',
    '十、中医药治疗与中西医结合',
    '十一、心理干预与综合护理策略',
    '十二、综合治疗方案与临床效果评估',
    '十三、2024-2025年最新研究趋势',
    '十四、总结与未来展望',
    '十五、参考文献',
  ]));

  // === PFD概述 ===
  slides.push(sectionSlide('第一部分', '女性盆底功能障碍性疾病概述'));

  slides.push(contentSlide('什么是盆底功能障碍性疾病（PFD）？', [
    '定义：盆底支持结构（肌肉、筋膜、韧带）损伤或功能减退导致的一组疾病',
    '主要类型：压力性尿失禁（SUI）、盆腔器官脱垂（POP）、性功能障碍、慢性盆腔痛',
    '全球患病率：女性PFD患病率约17.8%~74.07%，部分地区高达70.19%',
    '中国现状：我国女性PFD发病率约40%，产后女性更高，是重要的公共卫生问题',
    '核心病理：盆底肌肉、筋膜、韧带损伤，胶原蛋白代谢异常，雌激素水平下降',
    '高危人群：产后女性、围绝经期/绝经后女性、肥胖者、重体力劳动者',
  ]));

  slides.push(contentSlide('PFD的临床分型与核心症状', [
    '压力性尿失禁（SUI）：咳嗽、打喷嚏、运动时漏尿，最常见类型',
    '急迫性尿失禁（UUI）：突发强烈尿意后不自主漏尿',
    '盆腔器官脱垂（POP）：子宫、膀胱、直肠等器官下移，有坠胀感',
    '大便失禁/排便困难：肛门括约肌功能减退所致',
    '慢性盆腔疼痛：持续≥6个月的非周期性盆腔疼痛',
    '性功能障碍：性交疼痛、性欲减退、性满意度下降',
    '膀胱过度活动症（OAB）：尿频、尿急，伴或不伴尿失禁',
  ], '注：同一患者常同时存在多种PFD亚型，临床需综合评估'));

  slides.push(contentSlide('PFD的发病机制', [
    '解剖学机制：盆底"吊床"结构受损——韧带松弛、筋膜撕裂、肛提肌断裂',
    '内分泌机制：雌激素↓ → 胶原纤维合成↓ → 盆底组织弹性↓、萎缩变薄',
    '神经肌肉机制：阴部神经损伤 → 盆底肌去神经支配 → 肌力减退',
    '结缔组织机制：Collagen I/III 比例失调 → 组织机械强度降低',
    '分子机制：基质金属蛋白酶（MMPs）异常激活 → 细胞外基质降解加速',
    '腹内压机制：长期高腹压（肥胖、便秘、慢性咳嗽）→ 盆底超负荷',
  ], '理解发病机制有助于制定个体化非手术治疗方案'));

  // === 民族差异 ===
  slides.push(sectionSlide('第二部分', '流行病学特征 —— 民族差异'));

  slides.push(contentSlideFull('多民族流行病学数据概览', [
    '🔬 贵州苗族：POP患病率51.00%（最高），UI患病率12.00%（最低）—— 可能因素：负重劳动→POP高发；低脂饮食、较晚绝经→UI低发',
    '🔬 贵州布依族：POP患病率17.02%，UI患病率23.40% —— 中等水平',
    '🔬 贵州汉族：POP患病率21.00%，UI患病率34.00%（最高）—— 可能与生活方式、分娩方式差异有关',
    '🔬 西藏藏族：PFDI-20盆底功能障碍评分显著高于当地汉族（P<0.05）—— 高原环境、多产次、重体力劳动',
    '🔬 新疆维族vs汉族：胶原蛋白I/III表达水平差异显著；雌激素受体SNP位点（rs17847075、rs1256049）基因型频率显著不同',
    '🔬 多因素Logistic回归证实：年龄、民族、分娩方式是POP和UI的共同独立危险因素（P<0.05）',
  ], '来源：贵州医科大学、西藏自治区横断面研究（2023-2024）、新疆医科大学'));

  slides.push(tableSlide('不同民族PFD患病率与特点比较',
    ['民族', 'POP患病率', 'UI患病率', '分子特征', '主要关联因素'],
    [
      ['苗族', '51.00%（最高）', '12.00%（最低）', '待研究', '重体力劳动、健康意识低'],
      ['布依族', '17.02%', '23.40%', '待研究', '中等程度'],
      ['汉族（贵州）', '21.00%', '34.00%（最高）', '参照组', '分娩方式、生活方式'],
      ['藏族', '评分显著较高', '较高', '待研究', '高原环境、多产次'],
      ['维族', '较高', '较高', 'Col I/III差异\\nER基因多态性', '遗传背景、胶原代谢'],
    ],
  '数据来源：贵州医科大学、西藏自治区研究（2023-2024）、新疆医科大学'));

  slides.push(contentSlide('民族差异的深层机制与临床意义', [
    '遗传因素：不同民族间胶原蛋白基因、雌激素受体基因（ESR1/ESR2）多态性差异',
    '环境适应：高海拔藏族的盆腔解剖适应性差异，低氧环境影响组织修复',
    '社会经济因素：不同民族地区医疗保健可及性、健康素养水平差异显著',
    '劳动模式：苗族女性多从事山地负重劳动 → 慢性腹压增高 → POP风险↑',
    '膳食结构：苗族低脂饮食、多摄入植物性蛋白 → UI风险相对较低（保护因素）',
    '生育模式：不同民族生育次数、分娩方式、产后休养习俗差异',
    '临床启示：民族针对性预防策略 → 少数民族地区应加强盆底健康教育',
  ]));

  // === 年龄因素 ===
  slides.push(sectionSlide('第三部分', '年龄因素对PFD的影响'));

  slides.push(contentSlideFull('年龄：PFD最重要的不可控危险因素', [
    '🔑 年龄每增加1岁 → 盆底肌力异常风险增加1.181倍（OR=1.181，邯郸市1532例调查，2025）',
    '🔑 35岁以后女性POP发生风险是年轻女性的2.44倍；50岁以后为1.86倍（2024专家共识）',
    '🔑 >55岁老年女性PFD患病率达48.60%，呈持续上升趋势（浙江临床医学，2025）',
    '🔑 SUI患病率高峰在45-59岁（EAU指南，2025）',
    '🔑 绝经是PFD显著危险因素（OR=2.686）—— 雌激素水平断崖式下降是关键机制',
    '🔑 绝经年龄越早，PFD发病风险越高 —— 观察组绝经年龄49.33±3.71岁 vs 对照组54.01±4.28岁',
    '🔑 年龄效应贯穿PFD全程：从产后、围绝经到老年期，各阶段干预策略不同',
  ]));

  slides.push(contentSlideFull('年龄相关PFD的生理机制', [
    '雌激素下降：绝经后E2水平↓ → 盆底组织胶原合成↓50%以上 → 组织萎缩松弛',
    '肌肉衰减：随年龄增长盆底肌纤维数量↓、肌力↓，快肌纤维（II型）减少尤其明显',
    '神经退行性变：阴部神经传导速度减慢 → 盆底肌反应延迟 → 控尿能力↓',
    '筋膜弹性退化：盆内筋膜弹性纤维断裂，韧性降低 → 器官支撑力下降',
    '累积暴露效应：年龄越大，生育、便秘、重体力劳动等危险因素累积暴露时间越长',
    '合并症累积：高血压、糖尿病、慢性呼吸道疾病等随年龄增加而累积 → 加重PFD',
  ]));

  slides.push(tableSlide('不同年龄段PFD防治策略',
    ['年龄段', 'PFD风险特征', '防治重点', '推荐非手术治疗'],
    [
      ['孕产期（20-40岁）', '妊娠+分娩损伤', '产后42天盆底评估\\n产后康复黄金期', 'PFMT、生物反馈、\\n产后康复操'],
      ['围绝经期（40-55岁）', '雌激素波动式下降\\nPFD加速进展期', '激素评估+盆底筛查\\n生活方式干预', 'PFMT+电刺激、\\n磁刺激、激光治疗'],
      ['绝经后期（55-65岁）', '雌激素持续低水平\\nPOP高发期', '综合评估、多学科管理\\n阴道雌激素+盆底康复', '联合治疗：PFMT+电刺激\\n+中医+阴道雌激素'],
      ['老年期（>65岁）', '合并症多、肌力差\\n治疗依从性下降', '安全优先、个体化\\n家庭支持、心理关怀', '温和PFMT、居家训练\\n数字化远程康复'],
    ],
  ));

  // === 生活习惯 ===
  slides.push(sectionSlide('第四部分', '生活习惯相关危险因素'));

  slides.push(contentSlideFull('九大可改变的生活习惯危险因素（2025年最新数据）', [
    '❶ 久坐不动：OR=2.834 —— 盆底肌力异常的最强预测因素，每45分钟应起身活动',
    '❷ 腹型肥胖：OR=2.318 —— BMI>30者盆底疾病风险增加2倍；目标BMI<24、腰围<85cm',
    '❸ 重体力劳动：OR=2.339 —— 长期负重、高强度劳动导致慢性腹压增高',
    '❹ 长期便秘：OR=2.152 —— 排便时用力屏气 → 盆底反复超负荷',
    '❺ 如厕时间≥10分钟：OR=1.964 —— 应控制在5分钟以内',
    '❻ 焦虑：OR=1.815 —— 精神心理因素对盆底功能有直接负面影响',
    '❼ 性生活频率≥3次/周：OR=1.690 —— 盆底肌持续高张力的潜在影响（2025新发现）',
    '❽ 吸烟/饮酒：多项研究确认为PFD危险因素；慢性咳嗽加重腹压',
    '❾ 长期站立/高跟鞋：女教师人群中两者均为SUI/POP独立危险因素',
  ], '来源：邯郸市1532名成年女性调查（2025）、重庆市1342例女教师调查（2024）、EAU指南（2025）'));

  slides.push(contentSlide('生活方式的保护因素与预防建议', [
    '规律运动：游泳、骑行等低冲击有氧运动优先；避免高强度跑跳',
    '凯格尔运动：每天3组×8-12次收缩，每次保持6-8秒，持之以恒',
    '体重管理：BMI控制在18.5-24 kg/m²，腰围<85cm（中国女性标准）',
    '排便习惯：增加膳食纤维（≥25g/天）、充足饮水（>1.5L/天）、定时排便',
    '戒烟限酒：吸烟者PFD风险显著升高；限制酒精摄入',
    '腹压管理：治疗慢性咳嗽、过敏性鼻炎、避免长期束腹带',
    '正确姿势：减少久坐时间，避免长时间蹲姿；搬重物时屈膝不弯腰',
    '产后护理：产后6周行盆底肌力评估，肌力≤3级者应接受康复治疗',
  ]));

  // === 心理因素 ===
  slides.push(sectionSlide('第五部分', '心理因素与PFD的双向关系'));

  slides.push(contentSlideFull('PFD患者心理问题的流行病学与影响', [
    '🔴 约30%的PFD患者伴随焦虑症状（焦虑发生率30.9%，抑郁发生率30.3%）—— 2025年综述',
    '🔴 PFIQ-7盆底功能评分与抑郁、焦虑、失眠显著正相关（P<0.0001，Molina-Barea 2024）',
    '🔴 焦虑程度与盆底肌筋膜疼痛程度显著正相关（r=0.411, P=0.002，刘小梦等 2025）',
    '🔴 PFD症状越重 → 生活质量越低 → 心理困扰越深 → 形成恶性循环',
    '🔴 关键问题：PFD是心理困扰的"因"还是"果"？—— 成功治疗PFD后焦虑/抑郁显著改善（Kalata 2024），支持PFD→心理困扰的因果方向',
    '🔴 心理困扰使患者治疗依从性↓45% → 非手术治疗效果大打折扣',
  ]));

  slides.push(contentSlide('心理干预在PFD治疗中的重要作用', [
    '正念认知疗法：12周干预 → PFDI-20评分↓21.9%、GDS-15抑郁评分↓25.9%、SF-36生活质量↑10.8%',
    '多学科心理支持团队：精神科医师+盆底康复师+护理专家 → 协同管理身心症状',
    '循证理念整体护理：涵盖疾病认知纠正+盆底锻炼指导+心理疏导+家庭支持+生活指导',
    '盆底康复操+音乐放松训练：自然分娩产妇SAS焦虑↓、SDS抑郁↓、GQOLI-74生活质量↑',
    'Greene健康教育模式：健康知识讲解+行为指导+心理支持 → 消除误解与恐惧',
    'Newman护理模式（整体系统护理）：SAS/SDS评分显著降低，盆底肌力等级↑，SF-36↑',
  ]));

  slides.push(contentSlide('心理健康评估与筛查建议', [
    '评估时机：PFD初诊时、治疗开始前、治疗后4周、12周各评估一次',
    '推荐量表：GAD-7（广泛性焦虑）、PHQ-9（患者健康问卷抑郁量表）、HADS（医院焦虑抑郁量表）',
    '评估维度：焦虑、抑郁、躯体化症状、睡眠质量、性心理健康、社会功能',
    '高危识别：既往精神病史、社会支持不足、PFD症状严重、治疗期望不现实',
    '转诊指征：重度焦虑/抑郁（PHQ-9≥15或GAD-7≥15）→ 转精神科/心理科',
    '健康教育要点：帮助患者理解PFD是可治疗的，减轻羞耻感与病耻感',
  ]));

  // === 非手术治疗体系 ===
  slides.push(sectionSlide('第六部分', '非手术治疗方法体系总览'));

  slides.push(tableSlide('非手术治疗方法分类与证据等级（2024-2025）',
    ['治疗类别', '代表方法', '证据等级', '适用人群', '疗程'],
    [
      ['盆底肌训练', 'Kegel训练、功能性PFMT', 'A级（最高）', '所有PFD患者', '≥12周'],
      ['生物反馈疗法', 'EMG生物反馈、\\n压力生物反馈', 'A级', '盆底肌感知差者', '8-12周'],
      ['电刺激治疗', '阴道内电刺激、\\n体表电刺激', 'A级（联合PFMT）', 'SUI、肌力极弱者', '8-12周'],
      ['磁刺激治疗', '体外盆底磁刺激', 'B级', '围绝经期PFD', '4-8周'],
      ['激光/射频', 'CO₂点阵激光、射频', 'B级（新兴）', '轻中度SUI、\\n阴道松弛', '3-5次'],
      ['中医药治疗', '补中益气汤、针灸', 'B级', '中老年FPFD', '8-12周'],
      ['再生医学', 'PRP、干细胞注射', 'C级（探索）', '研究阶段', '个体化'],
      ['数字化康复', 'mHealth APP+PFMT', 'B级（新兴）', '依从性不足者', '≥8周'],
    ],
  '注：A级=Cochrane/Meta分析支持；B级=高质量RCT支持；C级=初步临床证据'));

  // === PFMT ===
  slides.push(sectionSlide('第七部分', '盆底肌训练（PFMT）—— 一线治疗基石'));

  slides.push(contentSlideFull('PFMT的核心循证证据（Cochrane 2024更新）', [
    '📊 Cochrane系统评价（2024）：纳入63项RCT、4920例女性 —— PFMT是目前证据最充分的PFD保守治疗',
    '📊 直接PFMT（孤立盆底肌收缩）优于间接训练 —— 生活质量改善 SMD=0.70（低确定性证据）',
    '📊 绝经后女性PFMT效果：SUI严重程度显著降低 SMD=-1.30（95%CI -1.97~-0.62），92%概率获益',
    '📊 慢性盆腔痛：荟萃8项RCT，PFMT显著减轻疼痛 SMD=-1.25~-1.30，改善肌力和生活质量',
    '📊 功能性PFMT（融合核心肌群协同收缩+多体位训练）优于传统PFMT —— 肌力↑、漏尿量↓、依从率↑',
    '📊 个体vs团体督导：效果差异无统计学意义（中等确定性证据）—— 均可推荐',
    '📊 e-Health远程PFMT：优于书面指导，接近面对面指导效果 —— 提高可及性的有效方案',
  ]));

  slides.push(contentSlide('PFMT的实施要点与技术规范', [
    '训练频率：每天3组×8-12次收缩，每周坚持5-7天，至少持续12周',
    '收缩保持：每次收缩保持6-8秒 → 充分放松6-8秒 → 避免肌肉疲劳',
    '正确技巧：只收缩盆底肌 → 避免腹肌、臀部、大腿内收肌代偿 → 配合呼吸',
    '体位进阶：仰卧→坐位→站立→行走中训练 → 逐步增加难度',
    '核心协同：功能性PFMT融合膈肌呼吸+腹横肌激活+多裂肌协同',
    '监督模式：初始阶段建议专业人士指导 → 确认动作正确后过渡至家庭训练',
    '依从性提升：使用手机APP提醒+训练日志+可视化进度反馈',
  ]));

  // === 生物反馈与电刺激 ===
  slides.push(sectionSlide('第八部分', '生物反馈与电刺激联合治疗'));

  slides.push(contentSlideFull('生物反馈电刺激联合治疗的核心证据', [
    '🔬 Meta分析（Li等，2025）：8项研究、885名SUI患者 —— PFMT+电刺激联合治疗显著优于单一治疗',
    '🔬 尿失禁症状改善：OR=1.42（95%CI 1.10-1.85）；盆底肌力提高：OR=1.55（95%CI 1.20-2.05）',
    '🔬 生活质量提升：OR=4.29（95%CI 3.68-4.99）—— 联合治疗对生活质量的改善效果最为突出',
    '🔬 盆底磁刺激+肌电生物反馈（邓米娜等，2025）：围绝经期PFD总有效率97.10% vs 单一88.24%',
    '🔬 Greene健康教育+生物反馈电刺激+Kegel（Yuan 2024）：焦虑/抑郁↓、性生活质量↑、盆底肌力↑',
    '🔬 阴道内电刺激（IVES）系统评价（2025）：32项RCT，75%报告尿垫使用显著减少',
  ]));

  slides.push(contentSlide('生物反馈与电刺激的操作技术要点', [
    '生物反馈原理：阴道/肛门内置传感器 → 实时显示盆底肌活动 → 视觉/听觉反馈指导训练',
    '电刺激参数：频率20-50Hz（SUI）、5-10Hz（OAB/UUI）；脉宽200-400μs；强度"感觉阈-运动阈"之间',
    '治疗频次：每次20-30分钟，每周2-3次，8-12周为一疗程',
    '联合模式：先电刺激被动激活肌肉（10-15min）→ 再生物反馈主动训练（10-15min）',
    '个体化处方：根据盆底肌力分级（Oxford 0-5级）制定不同的电刺激-生物反馈方案',
    '禁忌症：妊娠期、盆腔急性感染、恶性肿瘤、心脏起搏器、严重心律失常',
  ]));

  // === 物理治疗新技术 ===
  slides.push(sectionSlide('第九部分', '磁刺激与物理治疗新技术'));

  slides.push(contentSlideFull('2024-2025年物理治疗新技术亮点', [
    '⚡ HIFEM（高强度聚焦电磁刺激）：非侵入性诱发深层盆底肌高强度收缩，8-12次/4-6周，疗效维持6-18个月',
    '⚡ Li-ESWT（低强度体外冲击波）：促进血管生成+肌肉再生，6次/8周，疗效维持12-24个月，无创安全',
    '⚡ 盆底磁刺激（FMS）：体外磁场穿透 → 无痛激活盆底神经肌肉 → 围绝经期PFD联合治疗有效率97.10%',
    '⚡ CO₂点阵激光：促进阴道黏膜新胶原形成 → 改善尿道/阴道结缔组织松弛，3-5次可维持12-24个月',
    '⚡ 射频治疗（RF）：热效应使胶原纤维即刻收缩+长期新生重塑 → 阴道紧致+轻度SUI改善',
    '⚡ 功能性PFMT：核心肌群协同收缩+多体位训练 → 优于传统孤立PFMT（中国康复研究中心，2025）',
  ]));

  slides.push(tableSlide('新兴物理治疗技术对比',
    ['技术', '原理', '疗程', '疗效维持', '适用场景', '2025证据'],
    [
      ['HIFEM', '聚焦电磁→超强肌缩', '8-12次/4-6周', '6-18个月', '盆底肌力弱者', 'Meta分析'],
      ['Li-ESWT', '冲击波→血管+肌肉再生', '6次/8周', '12-24个月', 'SUI、慢性盆腔痛', '多项RCT'],
      ['磁刺激', '体外磁场→神经肌肉激活', '2-3次/周×8周', '6-12个月', '围绝经期PFD', '97.10%'],
      ['CO₂激光', '热损伤→新胶原形成', '3-5次', '12-24个月', '轻中度SUI、阴道松弛', 'RCT+Meta'],
      ['射频', '热效应→胶原重塑', '3-6次', '6-18个月', '阴道松弛、轻度SUI', '初步RCT'],
    ],
  ));

  // === 中医药 ===
  slides.push(sectionSlide('第十部分', '中医药治疗与中西医结合'));

  slides.push(contentSlideFull('补中益气汤联合生物反馈电刺激：多项2025研究验证', [
    '🌟 常熟市中医院（陆燕等，2025）：补中益气颗粒+电刺激 → ICI-Q-SF评分显著↓、盆底肌力↑、SOD/GSH-Px抗氧化指标↑',
    '🌟 南昌大学二附院（平璐依等，2025）：三维盆底超声客观评估 → BND↓、URA↓、LHA↓（肛提肌裂孔面积缩小）',
    '🌟 机制分析：补中益气 → 升阳举陷 → 增强盆底组织张力；调节胶原代谢 → 促进组织修复',
    '🌟 现代药理：黄芪、升麻、柴胡含异黄酮类物质 → 类雌激素样作用 → 协同盆底康复',
    '🌟 中西医协同优势：西医物理治疗"修复结构"+中医内调"补益气血" → 标本兼治',
    '🌟 综合疗效：联合治疗总有效率显著高于单一西医治疗，且不良反应少，远期复发率低',
  ]));

  slides.push(contentSlide('中医药在PFD中的整体治疗方案', [
    '内服方剂：补中益气汤加减（黄芪、党参、白术、升麻、柴胡、当归、陈皮、甘草）',
    '针灸疗法：取穴——关元、气海、中极、足三里、三阴交、肾俞、次髎',
    '艾灸疗法：温灸关元、神阙 → 温阳固脱 → 适用于虚寒体质PFD患者',
    '中药熏蒸/坐浴：蛇床子、苦参、黄柏熏蒸 → 改善阴道局部血液循环',
    '推拿按摩：特定穴位按摩 → 改善盆腔气血运行',
    '辨证分型：气虚下陷型（最常见）、肾虚不固型、湿热下注型 → 个体化方药',
    '中药+盆底康复：中西医联合方案——2024-2025年多中心RCT证实疗效优越',
  ], '注意事项：中药需在中医师辨证指导下使用，避免盲目自行服药'));

  // === 心理干预 ===
  slides.push(sectionSlide('第十一部分', '心理干预与综合护理策略'));

  slides.push(contentSlideFull('多学科心理支持的核心模式（2024-2025 循证）', [
    '🧠 多学科团队构成：盆底康复师+精神心理科医师+护理专家+营养师 —— 协同管理',
    '🧠 正念认知疗法（MBCT）：12周 → PFDI-20↓21.9%、GDS-15↓25.9%、SF-36↑10.8%（刘亚旗 2025）',
    '🧠 Newman整体护理模式：SAS/SDS↓、SF-36↑、盆底肌力等级↑（Wang 2024，随机对照）',
    '🧠 Greene健康教育+心理支持+行为指导：焦虑↓、抑郁↓、性生活质量↑、肌力EMG↑（Yuan 2024）',
    '🧠 远程数字化DCP：教育+PFMT+实时生物反馈 → PHQ-9/GAD-7↓、满意度8.9/10（Janela 2024）',
    '🧠 核心机制：正确认知PFD → 消除羞耻感与病耻感 → 提高治疗信心与依从性 → 正向反馈循环',
  ]));

  slides.push(contentSlide('综合护理与患者教育的实施框架', [
    '认知教育：PFD是可治疗的疾病，不是"年纪大了正常现象"—— 打消病耻感',
    '行为指导：一对一盆底肌收缩动作教学 → 确保动作正确性 → 提供书面/视频材料',
    '心理疏导：识别焦虑/抑郁信号 → 认知重构 → 必要时转介心理咨询',
    '家庭支持：动员配偶/家人参与 → 理解疾病本质 → 提供情感与行为支持',
    '随访管理：治疗后1周、4周、12周、24周评估 → 及时调整方案',
    '数字化工具：微信/APP推送提醒+训练日志+在线咨询 → 提高可及性',
  ]));

  // === 综合治疗 ===
  slides.push(sectionSlide('第十二部分', '综合治疗方案与临床效果评估'));

  slides.push(contentSlideFull('PFD非手术治疗的综合策略——"五维一体"模式', [
    '🎯 维度一【物理治疗】：PFMT（基础）+电刺激/磁刺激/HIFEM（强化）—— 重建盆底肌力与耐力',
    '🎯 维度二【行为干预】：体重管理+便秘防治+腹压控制+正确姿势 —— 消除致病因素',
    '🎯 维度三【药物辅助】：阴道低剂量雌激素（绝经后）+中药内服（辨证施治）—— 改善组织状态',
    '🎯 维度四【心理管理】：认知教育+正念疗法+心理支持 —— 打破"症状↔焦虑"恶性循环',
    '🎯 维度五【数字化管理】：mHealth APP远程监测+在线指导+智能提醒 —— 提高长期依从性',
    '',
    '💡 核心原则：联合治疗 > 单一治疗 | 个体化方案 > 标准化方案 | 长期管理 > 短期干预',
  ]));

  slides.push(tableSlide('不同类型PFD的推荐非手术治疗方案',
    ['PFD类型', '一线方案', '强化/联合方案', '辅助措施', '预期有效率'],
    [
      ['轻中度SUI', 'PFMT（≥12周）', 'PFMT+电刺激/磁刺激', '减重+生活方式调整', '70-90%'],
      ['重度SUI', 'PFMT+电刺激', '磁刺激+HIFEM', '阴道雌激素（绝经后）', '55-70%'],
      ['POP（I-II期）', 'PFMT（核心协同训练）', 'PFMT+电刺激+中医', '减重+便秘管理', '60-80%'],
      ['OAB/UUI', 'PFMT+膀胱训练', '电刺激（低频5-10Hz）', '行为+饮食管理', '65-85%'],
      ['慢性盆腔痛', 'PFMT+手法治疗', '生物反馈+CBT', '心理干预+放松训练', '60-75%'],
      ['产后PFD', 'PFMT+生物反馈', '电刺激+康复操', '健康宣教+心理支持', '80-95%'],
    ],
  ));

  slides.push(contentSlide('非手术治疗效果的客观评估方法', [
    '盆底肌力评估：改良Oxford分级（0-5级）+ 阴道测压计（Peritron）定量测量',
    '三维盆底超声：BND（膀胱颈移动度）、URA（尿道旋转角）、LHA（肛提肌裂孔面积）',
    '尿动力学检查：最大尿道闭合压、腹压漏尿点压（ALPP）、膀胱顺应性',
    '症状评分量表：ICI-Q-SF（尿失禁）、PFDI-20/PFIQ-7（盆底功能）、POP-Q（脱垂分度）',
    '生活质量量表：SF-36、KHQ（King\'s健康问卷）、P-QOL（脱垂生活质量）',
    '心理评估：GAD-7、PHQ-9、HADS — 在治疗前后同步评估心理状态变化',
    '生物标志物：血清SOD/GSH-Px（抗氧化指标）→ 评估中医联合治疗效果',
  ]));

  // === 最新研究趋势 ===
  slides.push(sectionSlide('第十三部分', '2024-2025年最新研究趋势'));

  slides.push(contentSlideFull('2024-2025年五大研究热点与趋势', [
    '🔥 趋势一【联合治疗优于单一治疗】：PFMT+电刺激循证A级（Meta分析，Li 2025）；磁刺激+生物反馈有效率97.10%',
    '🔥 趋势二【中西医结合客观化评估】：三维盆底超声验证补中益气汤联合效果（BND/URA/LHA均显著缩小，2025）',
    '🔥 趋势三【再生医学从实验走向临床】：PRP注射（2次/间隔4-6周，维持3-6月）；干细胞注射初步临床探索',
    '🔥 趋势四【数字化康复全面渗透】：mHealth APP+PFMT系统评价（Hao 2024）；远程DCP满意度8.9/10（Janela 2024）',
    '🔥 趋势五【心理评估纳入常规管理】：多学科心理支持可"逆转"PFD导致的心理问题（Kalata 2024前瞻性研究）',
    '',
    '📌 总趋势：从"单一技术"到"综合体系"、从"经验治疗"到"循证个体化"、从"被动康复"到"主动管理"',
  ]));

  slides.push(contentSlide('值得关注的前沿研究方向', [
    'PRP+PFMT联合方案：自体PRP注射增强组织修复+PFMT强化肌力 → 协同效应（Grigoriadis 2024）',
    'AI辅助盆底超声诊断：深度学习自动测量BND/URA/LHA → 提高诊断效率与一致性',
    '可穿戴盆底训练设备：智能阴道探头+手机APP → 实时反馈+游戏化训练 → 依从性↑',
    '微生物组与PFD：阴道/肠道菌群失调可能与PFD相关 → 益生菌干预新方向',
    '肠道菌群-盆底轴（Gut-Pelvic Axis）：短链脂肪酸（SCFAs）→ 影响胶原合成与炎症 → 新治疗靶点',
    '民族基因组学研究：不同民族PFD易感基因筛查 → 精准预防策略的基础',
  ]));

  // === 总结 ===
  slides.push(sectionSlide('第十四部分', '总结与未来展望'));

  slides.push(contentSlideFull('核心要点总结', [
    '✅ PFD是高患病率的女性慢性疾病，约30%患者伴随焦虑/抑郁 —— 身心同治是基本原则',
    '✅ 民族差异客观存在：苗族POP 51%、汉族UI 34% —— 遗传+环境+社会文化多因素综合作用',
    '✅ 年龄是不可控但可预判的因素 —— 产后42天、围绝经期是两个"黄金干预窗口期"',
    '✅ 九大可改变生活习惯因素中，久坐（OR=2.834）和肥胖（OR=2.318）是最强预测因子',
    '✅ PFMT是所有PFD治疗的一线基石（Cochrane A级证据），联合治疗显著优于单一治疗',
    '✅ 联合治疗总有效率：产后PFD 80-95%、轻中度SUI 70-90%、围绝经期PFD >97%',
    '✅ 补中益气汤+电刺激/生物反馈 —— 中西医协同标本兼治，是中国特色优势方案',
    '✅ 数字化康复+心理干预 → 提高依从性+改善心理健康 → 构建闭环管理体系',
  ]));

  slides.push(contentSlide('未来展望与行动建议', [
    '🎯 建立中国多民族PFD流行病学数据库 → 揭示民族特异性危险因素与保护因素',
    '🎯 开展多中心RCT验证中西医联合方案 → 推动中医药纳入PFD临床诊疗指南',
    '🎯 开发智能化盆底康复管理平台 → AI+可穿戴设备实现个性化远程康复',
    '🎯 将心理评估纳入PFD诊疗常规 → 精神科/心理科+盆底康复科多学科协作（MDT）',
    '🎯 盆底健康教育纳入妇女保健基本公共卫生服务 → "人人享有盆底健康"',
    '🎯 关注民族地区盆底健康公平性 → 培养少数民族盆底康复人才',
    '🎯 从"治已病"到"治未病" → 加强青春期、孕期、产后、围绝经期盆底健康宣教',
  ]));

  // === 参考文献 ===
  slides.push(contentSlideFull('主要参考文献（2024-2025）', [
    '1. Hay-Smith EJC, et al. PFMT for urinary incontinence. Cochrane Database Syst Rev, 2024.',
    '2. Li et al. PFMT + Electrical Stimulation for SUI: Meta-analysis. Urol Int, 2025; 109(4): 425.',
    '3. 邓米娜等. 盆底磁刺激联合盆底肌电生物反馈治疗围绝经期PFD. 中国综合临床, 2025.',
    '4. 陆燕等. 补中益气颗粒联合生物反馈电刺激治疗中老年FPFD. 北京大学学报（医学版）, 2025.',
    '5. 平璐依等. 补中益气汤联合生物反馈电刺激的盆底超声评估. 临床超声医学杂志, 2025.',
    '6. Kalata et al. Successful Treatment of SUI/POP on Depression, Anxiety, Insomnia. J Clin Med, 2024.',
    '7. Molina-Barea et al. HRQoL and Psychosocial Variables in Colorectal PFD. Physiother Theory Pract, 2024.',
    '8. 刘亚旗等. 多学科心理支持联合正念认知对老年子宫脱垂患者的效果. 国际医药卫生导报, 2025.',
    '9. Yuan et al. Health Education + Biofeedback ES on Pelvic Floor Psychology. Medicine, 2024; 103(34).',
    '10. 付静等. 女性SUI新型保守治疗机制与临床转化进展. 昆明医科大学学报, 2025.',
    '11. Lv A, et al. Prevalence of PFD in Parous Women from Tibet. J Multidiscip Healthc, 2024.',
    '12. Janela et al. Digital Care Program for UI in Females. Healthcare, 2024; 12(2): 141.',
    '13. Grigoriadis T, et al. PRP for PFD. 2024.',
    '14. 文芳等. 294名苗族布依族汉族妇女PFD患病状况及比较分析. 贵州医科大学学报.',
    '15. 邯郸市成年女性盆底肌力异常调查及影响因素分析. 海南医学, 2025.',
  ]));

  // === 结束页 ===
  slides.push(endSlide());

  // 构建PPTX
  console.log('正在生成PPTX文件...');
  const pptxData = buildPptx(slides);
  const outputPath = path.join(__dirname, '近三年女性盆底功能障碍性疾病_非手术治疗效果研究.pptx');
  fs.writeFileSync(outputPath, pptxData);
  console.log('✅ PPT已生成：' + outputPath);
  console.log('📊 共 ' + slides.length + ' 张幻灯片');
  console.log('📦 文件大小：' + (pptxData.length / 1024).toFixed(1) + ' KB');
}

main();
