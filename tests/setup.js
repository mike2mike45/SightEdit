// 基本テスト
describe('SightEdit Chrome Extension', () => {
  test('環境が正しくセットアップされている', () => {
    expect(true).toBe(true);
  });

  test('Chrome API がモックされている', () => {
    expect(global.chrome).toBeDefined();
    expect(global.chrome.runtime).toBeDefined();
    expect(global.chrome.storage).toBeDefined();
    expect(global.chrome.tabs).toBeDefined();
  });

  test('DOM 環境が利用可能', () => {
    document.body.innerHTML = '<div id="test">Hello World</div>';
    const element = document.getElementById('test');
    expect(element).toBeTruthy();
    expect(element.textContent).toBe('Hello World');
  });

  test('Chrome storage API が動作する', async () => {
    const testData = { key: 'value' };
    
    // storage.local.set のテスト
    await chrome.storage.local.set(testData);
    expect(chrome.storage.local.set).toHaveBeenCalledWith(testData);
    
    // storage.local.get のテスト
    await chrome.storage.local.get(['key']);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['key']);
  });

  test('Chrome runtime API が動作する', () => {
    const message = { type: 'test', data: 'hello' };
    
    chrome.runtime.sendMessage(message);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
  });
});