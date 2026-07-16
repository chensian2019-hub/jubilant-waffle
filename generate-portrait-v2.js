const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'www.yunzhuhub.com';
const KEY = 'sk-YlIKhK5Gv4aSoGjSCPPDQ4PscNS8rQRVRUakLWXTFCd4KqOw';
const MODEL = 'gpt-5.6-sol';

function apiPost(path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: BASE, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`
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
  console.log('🖼️  用 gpt-5.6-sol 给花花生成画像\n');

  const portraitPrompt = `画一张画像：一个来自青海的18岁中国女孩，刚高考完，
考了660分，被浙江大学竺可桢学院录取。她站在青海的草原和雪山背景下，
眼神里充满对未来的憧憬和好奇。远处有浙大的校园轮廓。
风格：温暖、唯美的二次元插画风格，柔光，充满希望的氛围。`

  // 方案1: 用图片生成接口，模型名用 gpt-5.6-sol
  console.log('--- 方案1: /v1/images/generations + gpt-5.6-sol ---');
  let result = await apiPost('/v1/images/generations', {
    model: MODEL,
    prompt: portraitPrompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json'
  });

  console.log('状态:', result.status);
  if (result.status === 200) {
    const imgData = result.body?.data?.[0];
    if (imgData?.b64_json) {
      const buf = Buffer.from(imgData.b64_json, 'base64');
      fs.writeFileSync('花花画像.png', buf);
      console.log('✅ 成功! 图片已保存: 花花画像.png');
      return;
    }
    if (imgData?.url) {
      console.log('✅ 图片URL:', imgData.url);
      return;
    }
    console.log('响应:', JSON.stringify(result.body).substring(0, 500));
    return;
  }
  console.log('失败:', JSON.stringify(result.body).substring(0, 300));

  // 方案2: 用 chat completions 接口生成图片（多模态模型）
  console.log('\n--- 方案2: /v1/chat/completions + gpt-5.6-sol (多模态输出) ---');
  result = await apiPost('/v1/chat/completions', {
    model: MODEL,
    messages: [
      { role: 'system', content: '你是一个图片生成AI。请根据用户的描述生成一张图片。请直接输出 base64 编码的图片数据。' },
      { role: 'user', content: portraitPrompt }
    ],
    max_tokens: 4096
  });

  console.log('状态:', result.status);
  if (result.status === 200) {
    console.log('响应:', JSON.stringify(result.body).substring(0, 800));
  } else {
    console.log('失败:', JSON.stringify(result.body).substring(0, 300));
  }

  // 方案3: 测试系统信息接口
  console.log('\n--- 方案3: 探测 API 能力 ---');
  result = await apiPost('/v1/chat/completions', {
    model: MODEL,
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 50
  });
  console.log('状态:', result.status);
  if (result.status === 200) {
    console.log('✅ 聊天接口可用!');
    console.log('响应:', JSON.stringify(result.body).substring(0, 500));
  } else {
    const msg = result.body?.error?.message || '';
    console.log('错误:', msg);
  }
}

main().catch(e => console.error('💥', e.message));
