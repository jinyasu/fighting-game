// スタンドアロン版(1ファイルHTML)のビルドスクリプト
// 使い方: node scripts/build-standalone.mjs
// 出力: dist/ring-of-fury.html — ダブルクリックだけで遊べる(サーバー不要)

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  alias: { three: './node_modules/three/build/three.module.js' },
});

// インラインscript内で閉じタグと誤認されないようエスケープ
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = readFileSync('index.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n/, '');
// 置換文字列中の $& や $` がメタ文字解釈されないよう関数形式で置換する
html = html.replace(
  '<script type="module" src="./src/main.js"></script>',
  () => `<script>\n${js}\n</script>`
);

mkdirSync('dist', { recursive: true });
writeFileSync('dist/ring-of-fury.html', html);
console.log(`dist/ring-of-fury.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
