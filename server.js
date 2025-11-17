const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const app = express();
const PORT = 8081;

// JSONリクエストのパース
app.use(express.json({ limit: '10mb' }));

// 静的ファイルの提供
app.use(express.static('dist'));

// ルートパスでeditor.htmlを表示
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'editor.html'));
});

// ファイルパス付きでエディターを開く
app.get('/file', async (req, res) => {
  const filePath = req.query.path;
  const fileName = req.query.name;
  
  console.log('📁 ファイル読み込みリクエスト:');
  console.log('  - path:', filePath);
  console.log('  - name:', fileName);
  
  // ファイルパスが指定されている場合はファイルを読み込んでパラメータとして渡す
  if (filePath) {
    try {
      // ファイルの存在確認
      await fs.access(filePath);
      
      // ファイル名を取得（nameパラメータがない場合）
      const extractedFileName = fileName || path.basename(filePath);
      console.log('📄 使用するファイル名:', extractedFileName);
      
      // ファイル内容を読み込み
      const fileContent = await fs.readFile(filePath, 'utf8');
      console.log('📋 ファイル読み込み成功、サイズ:', fileContent.length);
      
      // エディターページにファイル情報をクエリパラメータとして渡す
      const editorUrl = `/editor.html?fileName=${encodeURIComponent(extractedFileName)}&hasContent=true`;
      
      // HTMLファイルを送信（ファイル情報を埋め込み）
      let editorHtml = await fs.readFile(path.join(__dirname, 'dist', 'editor.html'), 'utf8');
      
      // ファイル内容をJavaScriptとして埋め込み
      const fileDataScript = `
        <script>
          window.INITIAL_FILE_DATA = {
            fileName: ${JSON.stringify(extractedFileName)},
            content: ${JSON.stringify(fileContent)},
            originalPath: ${JSON.stringify(filePath)}
          };
          console.log('🎯 初期ファイルデータ設定完了:', window.INITIAL_FILE_DATA.fileName);
        </script>
      `;
      
      // </head>タグの直前にスクリプトを挿入
      editorHtml = editorHtml.replace('</head>', fileDataScript + '</head>');
      
      res.send(editorHtml);
      
    } catch (error) {
      console.error('❌ ファイル読み込みエラー:', error);
      
      // エラーの場合は通常のエディターページを送信
      const errorScript = `
        <script>
          window.INITIAL_FILE_ERROR = {
            message: ${JSON.stringify(error.message)},
            path: ${JSON.stringify(filePath)}
          };
        </script>
      `;
      
      let editorHtml = await fs.readFile(path.join(__dirname, 'dist', 'editor.html'), 'utf8');
      editorHtml = editorHtml.replace('</head>', errorScript + '</head>');
      
      res.send(editorHtml);
    }
  } else {
    // ファイルパスが指定されていない場合は通常のエディターページを送信
    res.sendFile(path.join(__dirname, 'dist', 'editor.html'));
  }
});

// Pandoc DOCX変換API
app.post('/api/convert/docx', async (req, res) => {
  const tempDir = path.join(__dirname, 'temp');
  const timestamp = Date.now();
  const inputFile = path.join(tempDir, `input-${timestamp}.html`);
  const outputFile = path.join(tempDir, `output-${timestamp}.docx`);
  const referenceDoc = path.join(__dirname, 'assets', 'reference.docx');

  try {
    // tempディレクトリ作成
    await fs.mkdir(tempDir, { recursive: true });

    const { html, filename = 'document.docx', options = {} } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTMLコンテンツが必要です' });
    }

    // HTMLファイルを一時保存（UTF-8 BOM付きで保存して日本語対応強化）
    const htmlWithMeta = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SightEdit Document</title>
    <style>
        body { font-family: "Yu Gothic", "MS Gothic", "Meiryo", sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-weight: bold; }
        table { border-collapse: collapse; width: 100%; }
        table th, table td { border: 1px solid #ddd; padding: 8px; }
        table th { background-color: #f2f2f2; }
        code { background-color: #f1f1f1; padding: 2px 4px; font-family: "Consolas", monospace; }
        pre { background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd; }
    </style>
</head>
<body>
${html}
</body>
</html>`;

    await fs.writeFile(inputFile, htmlWithMeta, 'utf8');

    // Pandocコマンド構築（Google Docs互換性向上）
    let pandocCommand = `pandoc "${inputFile}" -o "${outputFile}" --from html --to docx --standalone`;
    
    // 高品質変換のためのオプション
    pandocCommand += ' --wrap=preserve';  // 改行保持
    pandocCommand += ' --highlight-style=tango';  // シンタックスハイライト
    
    // テーブル・リスト対応強化
    if (options.tables || html.includes('<table')) {
      pandocCommand += ' --columns=80';
    }
    
    // 目次生成（見出しが存在する場合）
    if (options.toc || html.includes('<h1') || html.includes('<h2')) {
      pandocCommand += ' --toc --toc-depth=3';
    }

    // リファレンステンプレートがある場合は使用
    try {
      await fs.access(referenceDoc);
      pandocCommand += ` --reference-doc="${referenceDoc}"`;
      console.log('リファレンステンプレート使用:', referenceDoc);
    } catch (refError) {
      console.log('リファレンステンプレートが見つかりません（デフォルトスタイルを使用）');
    }
    
    console.log('Pandoc実行:', pandocCommand);
    await execAsync(pandocCommand);

    // 変換されたファイルが存在するかチェック
    await fs.access(outputFile);

    // ファイルをダウンロード形式で送信
    res.download(outputFile, filename, async (err) => {
      // クリーンアップ
      try {
        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
      } catch (cleanupError) {
        console.warn('クリーンアップエラー:', cleanupError.message);
      }
      
      if (err) {
        console.error('ダウンロードエラー:', err);
      }
    });

  } catch (error) {
    console.error('DOCX変換エラー:', error);
    
    // クリーンアップ
    try {
      await fs.unlink(inputFile);
      await fs.unlink(outputFile);
    } catch (cleanupError) {
      // クリーンアップエラーは無視
    }

    res.status(500).json({ 
      error: 'DOCX変換に失敗しました',
      details: error.message 
    });
  }
});

// Pandocのバージョンチェック
app.get('/api/pandoc/version', async (req, res) => {
  try {
    const { stdout } = await execAsync('pandoc --version');
    res.json({ 
      available: true, 
      version: stdout.split('\n')[0],
      full: stdout 
    });
  } catch (error) {
    res.json({ 
      available: false, 
      error: 'Pandocがインストールされていません' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in Chrome to test the editor`);
});