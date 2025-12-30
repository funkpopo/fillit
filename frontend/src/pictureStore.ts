import { create } from 'zustand';
import type { PictureData } from './types';
import * as db from './db';

interface PictureState {
  pictures: Record<string, PictureData>;
  loading: boolean;
  addPicture: (picture: PictureData) => Promise<void>;
  removePicture: (id: string) => Promise<void>;
  getPictures: () => PictureData[];
  loadPictures: () => Promise<void>;
  saveProgress: (pictureId: string, filledRegions: number[]) => Promise<void>;
  getProgress: (pictureId: string) => Promise<number[]>;
}

export const usePictureStore = create<PictureState>()((set, get) => ({
  pictures: {},
  loading: true,

  addPicture: async (picture) => {
    await db.savePicture(picture);
    set((state) => ({
      pictures: { ...state.pictures, [picture.id]: picture }
    }));
  },

  removePicture: async (id) => {
    await db.deletePicture(id);
    set((state) => {
      const { [id]: _, ...rest } = state.pictures;
      return { pictures: rest };
    });
  },

  getPictures: () => Object.values(get().pictures),

  loadPictures: async () => {
    try {
      const pictures = await db.getPictures();
      const picturesMap: Record<string, PictureData> = {};
      pictures.forEach(p => { picturesMap[p.id] = p; });
      set({ pictures: picturesMap, loading: false });
    } catch (e) {
      console.error('Failed to load pictures:', e);
      set({ loading: false });
    }
  },

  saveProgress: async (pictureId, filledRegions) => {
    await db.saveProgress(pictureId, filledRegions);
  },

  getProgress: async (pictureId) => {
    return db.getProgress(pictureId);
  }
}));

db.initDB().then(() => {
  usePictureStore.getState().loadPictures();
}).catch((e) => {
  console.error('Failed to init DB:', e);
  usePictureStore.setState({ loading: false });
});
