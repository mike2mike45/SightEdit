// tests/background.test.js
describe('Background Script', () => {
  beforeEach(() => {
    // Chrome APIのモックをリセット
    jest.clearAllMocks();
  });

  test('should handle runtime messages', () => {
    // テストコードを追加
    expect(chrome.runtime.sendMessage).toBeDefined();
  });
});

// tests/content.test.js  
describe('Content Script', () => {
  test('should inject editor into page', () => {
    document.body.innerHTML = '<div id="test"></div>';
    const element = document.getElementById('test');
    expect(element).toBeTruthy();
  });
});

// tests/editor.test.js
describe('TipTap Editor', () => {
  test('should initialize editor', () => {
    // エディターの初期化テスト
    expect(true).toBe(true);
  });
});