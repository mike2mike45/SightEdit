import { test, expect, _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SightEdit Application', () => {
  let app;

  test.beforeAll(async () => {
    // Electronアプリケーションを起動
    const mainPath = path.join(__dirname, '../../src/main/main.js');
    app = await electron.launch({
      args: [mainPath]
    });
  });

  test.afterAll(async () => {
    // アプリケーションを閉じる
    if (app) {
      await app.close();
    }
  });

  test('should launch the application', async () => {
    const window = await app.firstWindow();
    expect(window).toBeTruthy();
    
    // タイトルの確認
    const title = await window.title();
    expect(title).toContain('SightEdit');
  });

  test('should have editor area', async () => {
    const window = await app.firstWindow();
    
    // エディターエリアが存在することを確認
    const editor = await window.locator('.ProseMirror');
    await expect(editor).toBeVisible();
  });

  test('should switch between WYSIWYG and source mode', async () => {
    const window = await app.firstWindow();
    
    // ソースモード切り替えボタンを探す
    const sourceButton = await window.locator('#toggle-source');
    if (await sourceButton.isVisible()) {
      await sourceButton.click();
      
      // テキストエリアが表示されることを確認
      const textarea = await window.locator('textarea');
      await expect(textarea).toBeVisible();
    }
  });

  test('should handle file operations', async () => {
    const window = await app.firstWindow();
    
    // 新規ファイル作成
    await window.evaluate(() => {
      window.electronAPI.newFile();
    });
    
    // エディターがクリアされることを確認
    const editor = await window.locator('.ProseMirror');
    const content = await editor.textContent();
    expect(content).toBe('');
  });
});