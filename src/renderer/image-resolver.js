// 画像の相対パス解決機能

let currentFileDirectory = null;

// パス操作のヘルパー関数（Electronレンダラープロセス用）
function dirname(path) {
  const lastIndex = path.lastIndexOf('/') !== -1 ? path.lastIndexOf('/') : path.lastIndexOf('\\');
  return lastIndex !== -1 ? path.substring(0, lastIndex) : '.';
}

function resolve(base, relative) {
  // Windows/Unixパスの正規化
  const normalizedBase = base.replace(/\\/g, '/');
  const normalizedRelative = relative.replace(/\\/g, '/');
  
  if (normalizedRelative.startsWith('/') || /^[a-zA-Z]:/.test(normalizedRelative)) {
    return normalizedRelative;
  }
  
  const baseParts = normalizedBase.split('/').filter(part => part.length > 0);
  const relativeParts = normalizedRelative.split('/').filter(part => part.length > 0);
  
  for (const part of relativeParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }
  
  // Windowsドライブレターを保持
  const result = baseParts.join('/');
  if (/^[a-zA-Z]:/.test(normalizedBase)) {
    return result;
  } else {
    return '/' + result;
  }
}

function isAbsolute(path) {
  return path.startsWith('/') || /^[a-zA-Z]:/.test(path);
}

/**
 * 現在のファイルディレクトリを設定
 * @param {string} filePath - 現在開いているファイルのパス
 */
export function setCurrentFileDirectory(filePath) {
  if (filePath && typeof filePath === 'string') {
    currentFileDirectory = dirname(filePath);
  } else {
    currentFileDirectory = null;
  }
}

/**
 * 相対パスの画像を絶対パスに変換
 * @param {string} imageSrc - 画像のsrc属性値
 * @returns {string} - 解決されたパス（Electronでアクセス可能なfile://形式）
 */
export function resolveImagePath(imageSrc) {
  // データURIやHTTPURL、絶対パスの場合はそのまま返す
  if (!imageSrc || 
      imageSrc.startsWith('data:') || 
      imageSrc.startsWith('http:') || 
      imageSrc.startsWith('https:') ||
      imageSrc.startsWith('file:') ||
      isAbsolute(imageSrc)) {
    return imageSrc;
  }
  
  // 現在のファイルディレクトリが設定されていない場合
  if (!currentFileDirectory) {
    console.warn('Current file directory not set for image path resolution');
    return imageSrc;
  }
  
  // 相対パスを絶対パスに変換
  const absolutePath = resolve(currentFileDirectory, imageSrc);
  
  // Electronでアクセスできるfile://形式に変換
  return `file://${absolutePath.replace(/\\/g, '/')}`;
}

/**
 * マークダウンコンテンツ内の画像パスを解決
 * @param {string} markdown - マークダウンコンテンツ
 * @returns {string} - 画像パスが解決されたマークダウン
 */
export function resolveImagesInMarkdown(markdown) {
  if (!markdown || !currentFileDirectory) {
    return markdown;
  }
  
  // 画像の正規表現パターン: ![alt](path) または ![alt](path "title")
  const imagePattern = /!\[([^\]]*)\]\(([^)"\s]+)(?:\s+"([^"]*)")?\)/g;
  
  return markdown.replace(imagePattern, (match, alt, src, title) => {
    const resolvedSrc = resolveImagePath(src);
    const titlePart = title ? ` "${title}"` : '';
    return `![${alt}](${resolvedSrc}${titlePart})`;
  });
}

/**
 * HTMLコンテンツ内の画像srcを解決
 * @param {string} html - HTMLコンテンツ
 * @returns {string} - 画像srcが解決されたHTML
 */
export function resolveImagesInHTML(html) {
  if (!html || !currentFileDirectory) {
    return html;
  }
  
  // img要素のsrc属性を解決
  return html.replace(/<img([^>]*)\s+src=["']([^"']+)["']([^>]*)>/g, (match, beforeSrc, src, afterSrc) => {
    const resolvedSrc = resolveImagePath(src);
    return `<img${beforeSrc} src="${resolvedSrc}"${afterSrc}>`;
  });
}

/**
 * エディターコンテンツの画像パスを保存用に相対パスに戻す
 * @param {string} content - エディターのコンテンツ
 * @returns {string} - 相対パスに戻されたコンテンツ
 */
export function restoreRelativeImagePaths(content) {
  if (!content || !currentFileDirectory) {
    return content;
  }
  
  // file://から始まるパスを相対パスに戻す
  const fileProtocolPattern = new RegExp(`file://${currentFileDirectory.replace(/\\/g, '/')}/([^"'\\s)]+)`, 'g');
  
  return content.replace(fileProtocolPattern, (match, relativePath) => {
    // 現在のディレクトリからの相対パスを計算
    return `./${relativePath}`;
  });
}