export interface Color {
  index: number;
  hex: string;
  rgb: number[];
}

export interface RegionInfo {
  id: number;
  colorIndex: number;
  pixelCount: number;
}

export interface PictureData {
  id: string;
  lineartUrl: string;
  coloredUrl: string;
  maskUrl: string;
  palette: Color[];
  regions: RegionInfo[];
  vlmError?: string;
}

export interface UserProgress {
  pictureId: string;
  filledRegions: number[];
}
