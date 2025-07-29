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
      }
    };
    this.config = { ...this.defaultConfig };
  }

  async load() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data);
      this.config = { ...this.defaultConfig, ...loadedConfig };
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
}

export default ConfigManager;