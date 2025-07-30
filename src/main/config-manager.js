import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESMでの__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../../sightedit-config.json');
    this.defaultConfig = {
      theme: 'light',
      window: {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        maximized: false
      },
      git: {
        repositories: {},  // リポジトリごとの設定
        globalUser: {      // グローバルユーザー設定
          name: null,
          email: null
        },
        defaultSettings: {
          autoStageAll: false,
          confirmBeforePush: true,
          confirmBeforePull: true,
          defaultBranch: 'main'
        }
      }
    };
    this.config = { ...this.defaultConfig };
  }

  async load() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data);
      // 深いマージを行う
      this.config = this.deepMerge(this.defaultConfig, loadedConfig);
      console.log('Configuration loaded:', this.config);
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Config file not found, using defaults');
        await this.save();
        return this.config;
      } else {
        console.error('Error loading config:', error);
        return this.config;
      }
    }
  }

  // 深いマージ関数
  deepMerge(target, source) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  async save() {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log('Configuration saved:', this.config);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  get(key) {
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) {
      value = value[k];
      if (value === undefined) break;
    }
    return value;
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }

  async updateTheme(theme) {
    this.set('theme', theme);
    await this.save();
  }

  async updateWindowState(windowState) {
    this.set('window', windowState);
    await this.save();
  }

  // Git関連の設定管理メソッド
  async getGitRepositoryConfig(repoPath) {
    if (!repoPath) return null;
    
    // パスを正規化（Windowsのバックスラッシュを統一）
    const normalizedPath = repoPath.replace(/\\/g, '/');
    
    if (!this.config.git) {
      this.config.git = { repositories: {}, globalUser: {}, defaultSettings: {} };
    }
    
    if (!this.config.git.repositories) {
      this.config.git.repositories = {};
    }
    
    return this.config.git.repositories[normalizedPath] || null;
  }

  async setGitRepositoryConfig(repoPath, config) {
    if (!repoPath) return;
    
    // パスを正規化
    const normalizedPath = repoPath.replace(/\\/g, '/');
    
    if (!this.config.git) {
      this.config.git = { repositories: {}, globalUser: {}, defaultSettings: {} };
    }
    
    if (!this.config.git.repositories) {
      this.config.git.repositories = {};
    }
    
    this.config.git.repositories[normalizedPath] = {
      ...this.config.git.repositories[normalizedPath],
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    await this.save();
  }

  async getGitGlobalUser() {
    if (!this.config.git || !this.config.git.globalUser) {
      return { name: null, email: null };
    }
    return this.config.git.globalUser;
  }

  async setGitGlobalUser(name, email) {
    if (!this.config.git) {
      this.config.git = { repositories: {}, globalUser: {}, defaultSettings: {} };
    }
    
    this.config.git.globalUser = { name, email };
    await this.save();
  }

  async getGitDefaultSettings() {
    if (!this.config.git || !this.config.git.defaultSettings) {
      return {
        autoStageAll: false,
        confirmBeforePush: true,
        confirmBeforePull: true,
        defaultBranch: 'main'
      };
    }
    return this.config.git.defaultSettings;
  }

  async setGitDefaultSettings(settings) {
    if (!this.config.git) {
      this.config.git = { repositories: {}, globalUser: {}, defaultSettings: {} };
    }
    
    this.config.git.defaultSettings = {
      ...this.config.git.defaultSettings,
      ...settings
    };
    await this.save();
  }

  // 最近使用したリポジトリの管理
  async addRecentRepository(repoPath) {
    if (!repoPath) return;
    
    const normalizedPath = repoPath.replace(/\\/g, '/');
    
    if (!this.config.git) {
      this.config.git = { repositories: {}, globalUser: {}, defaultSettings: {} };
    }
    
    if (!this.config.git.recentRepositories) {
      this.config.git.recentRepositories = [];
    }
    
    // 既存のエントリを削除
    this.config.git.recentRepositories = this.config.git.recentRepositories.filter(
      repo => repo.path !== normalizedPath
    );
    
    // 先頭に追加
    this.config.git.recentRepositories.unshift({
      path: normalizedPath,
      name: path.basename(normalizedPath),
      lastAccessed: new Date().toISOString()
    });
    
    // 最大10件まで保持
    if (this.config.git.recentRepositories.length > 10) {
      this.config.git.recentRepositories = this.config.git.recentRepositories.slice(0, 10);
    }
    
    await this.save();
  }

  async getRecentRepositories() {
    if (!this.config.git || !this.config.git.recentRepositories) {
      return [];
    }
    return this.config.git.recentRepositories;
  }
}

export default ConfigManager;