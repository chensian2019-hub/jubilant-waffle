const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 云竹 Hub API 配置
const BASE_URL = 'https://www.yunzhuhub.com';
const API_KEY = 'sk-YlIKhK5Gv4aSoGjSCPPDQ4PscNS8rQRVRUakLWXTFCd4KqOw';

// 花花的画像 prompt
const portraitPrompt = `A portrait illustration of a young Chinese student from Qinghai province,
around 18 years old, with bright and curious eyes full of dreams.
They come from the vast grasslands and snowy mountains of the Tibetan plateau.
An outstanding student who scored 660 in China's college entrance exam (Gaokao),
admitted to Zhejiang University's prestigious Chu Kochen Honors College.
The scene shows them standing at a crossroads between their hometown's natural beauty
(rolling grasslands, distant snow mountains, blue sky) and their bright future
(modern university buildings, technology symbols, AI neural network patterns glowing softly).
Style: warm, inspirational anime/manga illustration style, soft lighting,
vibrant colors, hopeful atmosphere. The character has a gentle smile,
wearing casual clothes, with traditional Tibetan elements subtly mixed in.
The overall feeling should be: limitless potential, dreams taking flight,
a bridge between tradition and future.`;

// 尝试 OpenAI 兼容的图片生成 API
function generateImageOpenAI() {
  return new Promise((resolve, reject) => {
    const url = new URL('/v1/images/generations', BASE_URL);
    const body = JSON.stringify({
      model: 'dall-e-3',
      prompt: portraitPrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log('🎨 正在调用图片生成 API (OpenAI 格式)...');
    console.log('📝 Endpoint:', url.href);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📡 响应状态:', res.statusCode);
        console.log('📡 响应头:', JSON.stringify(res.headers));

        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            resolve({ raw: data });
          }
        } else {
          console.log('📡 响应体 (前500字):', data.substring(0, 500));
          resolve({ error: true, status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

// 尝试使用 Anthropic Messages 格式（可能支持 vision？）
async function tryAllEndpoints() {
  // 先试 OpenAI 格式
  console.log('='.repeat(60));
  console.log('🖼️  花花画像生成器');
  console.log('='.repeat(60));
  console.log();

  const result = await generateImageOpenAI();

  if (result.error) {
    console.log('❌ OpenAI 格式失败，尝试其他格式...');
    // 尝试其他格式
    await tryAlternativeFormats();
  } else if (result.raw) {
    console.log('⚠️ 收到原始响应:', JSON.stringify(result.raw).substring(0, 500));
  } else if (result.data && result.data[0]) {
    // 成功！保存图片
    const imgData = result.data[0];
    if (imgData.b64_json) {
      const buffer = Buffer.from(imgData.b64_json, 'base64');
      const outputPath = path.join(__dirname, '花花画像.png');
      fs.writeFileSync(outputPath, buffer);
      console.log('✅ 图片已生成并保存到:', outputPath);
      console.log('📏 图片大小:', (buffer.length / 1024).toFixed(1), 'KB');
    } else if (imgData.url) {
      console.log('🔗 图片URL:', imgData.url);
      // 下载图片
      await downloadImage(imgData.url, path.join(__dirname, '花花画像.png'));
    }
  } else {
    console.log('🤔 意外响应格式:', JSON.stringify(result).substring(0, 500));
  }
}

async function tryAlternativeFormats() {
  // 试试不同的端点格式
  const endpoints = [
    { path: '/v1/images/generations', name: 'OpenAI Images API' },
    { path: '/api/v1/images/generations', name: 'Alt Images API' },
    { path: '/v1/chat/completions', name: 'Chat Completions (test)' },
  ];

  for (const ep of endpoints) {
    console.log(`\n🔄 尝试: ${ep.name} (${ep.path})`);
    try {
      await new Promise((resolve, reject) => {
        const url = new URL(ep.path, BASE_URL);
        const body = JSON.stringify(
          ep.path.includes('images')
            ? { model: 'dall-e-3', prompt: 'test', n: 1, size: '256x256' }
            : { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 }
        );

        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log(`  状态: ${res.statusCode}, 响应: ${data.substring(0, 200)}`);
            resolve(null);
          });
        });
        req.on('error', (e) => { console.log('  错误:', e.message); resolve(null); });
        req.write(body);
        req.end();
      });
    } catch (e) {
      console.log('  异常:', e.message);
    }
  }
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filepath, buffer);
        console.log('✅ 图片下载完成:', filepath);
        resolve();
      });
    }).on('error', reject);
  });
}

tryAllEndpoints().catch(err => {
  console.error('💥 出错了:', err.message);
});
