import { create } from 'zustand';
import type { PictureData } from './types';
import { usePictureStore } from './pictureStore';

interface GameState {
  pictures: PictureData[];
  currentPicture: PictureData | null;
  selectedColorIndex: number | null;
  filledRegions: Set<number>;
  loading: boolean;

  fetchPictures: () => void;
  selectPicture: (id: string) => Promise<void>;
  deletePicture: (id: string) => Promise<void>;
  selectColor: (index: number) => void;
  fillRegion: (regionId: number) => void;
  saveProgress: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  pictures: [],
  currentPicture: null,
  selectedColorIndex: null,
  filledRegions: new Set(),
  loading: false,

  fetchPictures: () => {
    const pictures = usePictureStore.getState().getPictures();
    set({ pictures });
  },

  selectPicture: async (id: string) => {
    const pictures = usePictureStore.getState().getPictures();
    const picture = pictures.find(p => p.id === id);
    if (picture) {
      const progress = await usePictureStore.getState().getProgress(id);
      set({ currentPicture: picture, filledRegions: new Set(progress) });
    }
  },

  deletePicture: async (id: string) => {
    await usePictureStore.getState().removePicture(id);
    const { currentPicture } = get();
    if (currentPicture?.id === id) {
      set({ currentPicture: null, filledRegions: new Set() });
    }
    get().fetchPictures();
  },

  selectColor: (index: number) => {
    set({ selectedColorIndex: index });
  },

  fillRegion: (regionId: number) => {
    const { filledRegions, currentPicture, selectedColorIndex } = get();
    if (!currentPicture || selectedColorIndex === null) return;

    const region = currentPicture.regions.find(r => r.id === regionId);
    if (!region || region.colorIndex !== selectedColorIndex) return;

    const newFilled = new Set(filledRegions);
    newFilled.add(regionId);
    set({ filledRegions: newFilled });
    get().saveProgress();
  },

  saveProgress: () => {
    const { currentPicture, filledRegions } = get();
    if (!currentPicture) return;
    usePictureStore.getState().saveProgress(currentPicture.id, Array.from(filledRegions));
  }
}));
