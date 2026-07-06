import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadLang } from '../../src/lib/i18n';

const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

describe('loadLang', () => {
  it('loads English translations with expected top-level keys', () => {
    const en = loadLang('en', I18N_DIR);
    expect(en).toHaveProperty('home');
    expect(en).toHaveProperty('detail');
    expect(en).toHaveProperty('pourGuide');
    expect(en).toHaveProperty('site');
  });

  it('loads Chinese translations with expected top-level keys', () => {
    const zh = loadLang('zh', I18N_DIR);
    expect(zh).toHaveProperty('home');
    expect(zh).toHaveProperty('detail');
    expect(zh).toHaveProperty('pourGuide');
    expect(zh).toHaveProperty('site');
  });

  it('has home.title in English', () => {
    const en = loadLang('en', I18N_DIR);
    expect(en.home).toHaveProperty('title');
    expect(typeof en.home.title).toBe('string');
    expect(en.home.title.length).toBeGreaterThan(0);
  });

  it('has home.title in Chinese', () => {
    const zh = loadLang('zh', I18N_DIR);
    expect(zh.home).toHaveProperty('title');
    expect(typeof zh.home.title).toBe('string');
    expect(zh.home.title.length).toBeGreaterThan(0);
  });

  it('throws for unsupported language code', () => {
    expect(() => loadLang('de', I18N_DIR)).toThrow();
  });

  it('uses default I18N_DIR when no dir is provided', () => {
    const en = loadLang('en');
    expect(en).toHaveProperty('home');
  });
});
