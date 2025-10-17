const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// 静的ファイルの提供
app.use(express.static('dist'));

// ルートパスでeditor.htmlを表示
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'editor.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in Chrome to test the editor`);
});