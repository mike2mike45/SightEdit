const { describe, test, expect } = require('@jest/globals');

describe('Basic Tests', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should test string operations', () => {
    const testString = 'Hello World';
    expect(testString).toContain('World');
    expect(testString.length).toBe(11);
  });

  test('should test file path validation logic', () => {
    // ファイルパスの基本的な検証ロジックのテスト
    const validPaths = [
      'C:\\Users\\test\\file.md',
      'C:\\Documents\\project.markdown',
      'D:\\work\\notes.txt'
    ];

    const invalidPaths = [
      'file.exe',
      'script.js',
      'document.html'
    ];

    validPaths.forEach(path => {
      const isValid = /\.(md|markdown|txt)$/i.test(path);
      expect(isValid).toBe(true);
    });

    invalidPaths.forEach(path => {
      const isValid = /\.(md|markdown|txt)$/i.test(path);
      expect(isValid).toBe(false);
    });
  });

  test('should validate null byte detection', () => {
    const safePath = 'C:\\Users\\test\\file.md';
    const dangerousPath = 'C:\\Users\\test\\file\x00.md';

    expect(safePath.indexOf('\x00')).toBe(-1);
    expect(dangerousPath.indexOf('\x00')).toBeGreaterThan(-1);
  });

  test('should test markdown patterns', () => {
    const markdownPatterns = {
      heading1: /^#\s+(.+)$/,
      heading2: /^##\s+(.+)$/,
      bold: /\*\*(.+?)\*\*/,
      italic: /\*(.+?)\*/,
      code: /`(.+?)`/
    };

    expect('# Heading 1').toMatch(markdownPatterns.heading1);
    expect('## Heading 2').toMatch(markdownPatterns.heading2);
    expect('**bold text**').toMatch(markdownPatterns.bold);
    expect('*italic text*').toMatch(markdownPatterns.italic);
    expect('`inline code`').toMatch(markdownPatterns.code);
  });
});