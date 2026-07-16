const https = require('https');
const fs = require('fs');

const BASE = 'www.yunzhuhub.com';
const KEY = 'sk-YlIKhK5Gv4aSoGjSCPPDQ4PscNS8rQRVRUakLWXTFCd4KqOw';

function apiGet(path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: BASE, path, method: 'GET',
      headers: { 'Authorization': `Bearer ${KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.end();
  });
}

function apiPost(path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: BASE, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function main() {
  // 1. 查询可用模型列表
  console.log('📋 查询可用模型列表...\n');
  const models = await apiGet('/v1/models');

  if (models.body && models.body.data) {
    const list = models.body.data;
    console.log(`共 ${list.length} 个模型:\n`);
    list.forEach(m => console.log(`  📎 ${m.id} (owned_by: ${m.owned_by || '?'})`));

    // 找出可能是图片生成的模型
    const imgModels = list.filter(m =>
      m.id.includes('dall') || m.id.includes('image') ||
      m.id.includes('sd') || m.id.includes('stable') ||
      m.id.includes('flux') || m.id.includes('midjourney') ||
      m.id.includes('draw') || m.id.includes('pic')
    );
    if (imgModels.length > 0) {
      console.log(`\n🎨 可能的图片模型: ${imgModels.map(m => m.id).join(', ')}`);
    }
  } else {
    console.log('响应:', JSON.stringify(models.body).substring(0, 1000));
  }

  // 2. 测试各种图片模型
  console.log('\n--- 测试图片生成 ---\n');
  const toTest = [
    'dall-e-3', 'dall-e-2', 'gpt-image-1',
    'image-alpha', 'stable-diffusion-xl', 'flux',
    'midjourney', 'sdxl', 'sd-turbo'
  ];

  for (const model of toTest) {
    const result = await apiPost('/v1/images/generations', {
      model, prompt: 'a cute orange cat', n: 1, size: '256x256'
    });

    if (result.status === 200) {
      console.log(`✅ ${model} — 成功!`);
      const imgData = result.body?.data?.[0];
      if (imgData?.b64_json) {
        fs.writeFileSync(`test-${model}.png`, Buffer.from(imgData.b64_json, 'base64'));
        console.log('   图片已保存');
      }
      if (imgData?.url) console.log('   URL:', imgData.url.substring(0, 80));
    } else {
      const msg = result.body?.error?.message || JSON.stringify(result.body).substring(0, 80);
      console.log(`❌ ${model} — ${msg}`);
    }
  }

  console.log('\n✅ 完成!');
}

main().catch(e => console.error('错误:', e.message));
