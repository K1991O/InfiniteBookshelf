export interface Book {
  id: string;
  googleId: string;
  title: string;
  author: string;
  thickness: number; // in cm
  height: number; // in cm
  width: number; // in cm
  smallThumbnail: string;
  ISBN10?: string;
  ISBN13?: string;
  spineThumbnail?: string;
  spineUploaded?: boolean;
}

export const SHELF_HEIGHT_CM = 40; // cm
