import { create } from 'zustand';
import * as db from './db';

export type ApiChannel = 'seedream';

interface SeedreamConfig {
  apiKey: string;
}

interface SettingsState {
  apiChannel: ApiChannel;
  seedreamConfig: SeedreamConfig;
  loading: boolean;
  setApiChannel: (channel: ApiChannel) => void;
  setSeedreamConfig: (config: SeedreamConfig) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  apiChannel: 'seedream',
  seedreamConfig: { apiKey: '' },
  loading: true,

  setApiChannel: (channel) => set({ apiChannel: channel }),

  setSeedreamConfig: async (config) => {
    await db.saveSettings({ apiKey: config.apiKey });
    set({ seedreamConfig: config });
  },

  loadSettings: async () => {
    const settings = await db.getSettings();
    if (settings) {
      set({ seedreamConfig: { apiKey: settings.apiKey } });
    }
    set({ loading: false });
  }
}));

db.initDB().then(() => {
  useSettingsStore.getState().loadSettings();
});
