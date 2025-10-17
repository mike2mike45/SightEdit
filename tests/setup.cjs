// @testing-library/jest-domは現在未使用
// require('@testing-library/jest-dom');

// Electronのモック
global.electron = {
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn()
  }
};

// window.electronAPIのモック
global.window = {
  electronAPI: {
    invoke: jest.fn(),
    on: jest.fn(),
    openExternal: jest.fn(),
    clipboard: {
      writeText: jest.fn(),
      readText: jest.fn()
    },
    git: {
      checkAvailability: jest.fn(),
      getStatus: jest.fn(),
      commit: jest.fn()
    }
  }
};

// console.errorをモック化してテスト中のエラーを抑制
const originalError = console.error;

beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});