import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';

const captured = vi.hoisted(() => ({
  toggles: new Map<string, (value: boolean) => void>(),
  dropdowns: new Map<string, (value: string) => void>(),
  dropdownValues: new Map<string, string>(),
  dropdownOptions: new Map<string, string[]>(),
}));

vi.mock('obsidian', () => {
  const element = {
    empty() {},
    addClass() {},
    appendText() {},
    createEl() {
      return element;
    },
    createDiv() {
      return element;
    },
  };
  class Setting {
    nameEl = element;
    name = '';
    setName(name: string) {
      this.name = name;
      return this;
    }
    setDesc(_desc: string) {
      return this;
    }
    addButton(fn: (value: unknown) => void) {
      const button = {
        setWarning() {
          return button;
        },
        setButtonText(_name: string) {
          return button;
        },
        setCta() {
          return button;
        },
        onClick(_fn: () => void) {
          return button;
        },
      };
      fn(button);
      return this;
    }
    addToggle(fn: (value: unknown) => void) {
      const label = this.name;
      const control = {
        setValue(_value: boolean) {
          return control;
        },
        onChange(callback: (value: boolean) => void) {
          captured.toggles.set(label, callback);
          return control;
        },
      };
      fn(control);
      return this;
    }
    addDropdown(fn: (value: unknown) => void) {
      const label = this.name;
      const options: string[] = [];
      captured.dropdownOptions.set(label, options);
      const control = {
        addOption(value: string, _text: string) {
          options.push(value);
          return control;
        },
        setValue(value: string) {
          captured.dropdownValues.set(label, value);
          return control;
        },
        onChange(callback: (value: string) => void) {
          captured.dropdowns.set(label, callback);
          return control;
        },
      };
      fn(control);
      return this;
    }
  }
  return {
    PluginSettingTab: class PluginSettingTab {
      containerEl = element;
    },
    Setting,
    debounce: (fn: unknown) => fn,
  };
});

import { AgentageMemorySettingTab } from './settings-tab';

function fixture(interval = 5) {
  const settings = {
    ...DEFAULT_SETTINGS,
    origin: { ...DEFAULT_SETTINGS.origin, interval },
  };
  const host = {
    settings,
    saveSettings: vi.fn(async () => {}),
    refreshAutoSyncSchedule: vi.fn(),
    vaultRootPath: () => 'synthetic-vault',
    isDesktop: false,
    openSignIn: vi.fn(),
    isSignedIn: () => true,
    disconnect: vi.fn(async () => {}),
    applyConfig: vi.fn(async () => ({ ok: true, path: 'synthetic-config' })),
    chooseMemory: vi.fn(),
    activeSiteFqdn: () => 'agentage.io',
  };
  const tab = new AgentageMemorySettingTab({} as never, host);
  tab.display();
  return host;
}

describe('Agentage settings UI for automatic synchronization', () => {
  beforeEach(() => {
    captured.toggles.clear();
    captured.dropdowns.clear();
    captured.dropdownValues.clear();
    captured.dropdownOptions.clear();
  });

  it('renders automatic-sync toggle and an interval selector with manual mode', () => {
    fixture();
    expect(captured.toggles.has('Automatic synchronization')).toBe(true);
    expect(captured.dropdowns.has('Sync interval')).toBe(true);
    expect(captured.dropdownValues.get('Sync interval')).toBe('5');
    expect(captured.dropdownOptions.get('Sync interval')).toContain('0');
  });

  it('applies toggle and interval changes immediately and persists their values', () => {
    const host = fixture();
    captured.toggles.get('Automatic synchronization')!(false);
    expect(host.settings.syncEnabled).toBe(true); // remote integration remains configured
    expect(host.settings.autoSyncEnabled).toBe(false);
    expect(host.applyConfig).not.toHaveBeenCalled(); // no core remote reconfiguration
    expect(host.refreshAutoSyncSchedule).toHaveBeenCalledTimes(1);
    captured.dropdowns.get('Sync interval')!('15');
    expect(host.settings.origin.interval).toBe(15);
    expect(host.refreshAutoSyncSchedule).toHaveBeenCalledTimes(2);
    expect(host.saveSettings).toHaveBeenCalledTimes(2);
    captured.dropdowns.get('Sync interval')!('0');
    expect(host.settings.origin.interval).toBe(0);
    expect(host.refreshAutoSyncSchedule).toHaveBeenCalledTimes(3);
  });

  it('keeps an existing custom interval visible without inventing a new default', () => {
    fixture(17);
    expect(captured.dropdownValues.get('Sync interval')).toBe('17');
    expect(captured.dropdownOptions.get('Sync interval')).toContain('17');
  });

  it('rejects unsafe dropdown values without updating the timer', () => {
    const host = fixture();
    captured.dropdowns.get('Sync interval')!('-1');
    captured.dropdowns.get('Sync interval')!('NaN');
    captured.dropdowns.get('Sync interval')!('999999999');
    expect(host.settings.origin.interval).toBe(5);
    expect(host.refreshAutoSyncSchedule).not.toHaveBeenCalled();
  });
});
