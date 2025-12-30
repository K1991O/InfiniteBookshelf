import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PADDING = 34.5;
export const CONTAINER_WIDTH = SCREEN_WIDTH - PADDING * 2;

// Shelf layout (as ratios of screen width)
export const SHELF_HEIGHT_RATIO = 0.62; // Shelf height as % of screen width (limits book height)
export const SHELF_SPACING_RATIO = 0.685; // Gap between shelves
export const SHELF_START_RATIO = 0.77; // First shelf position from top
export const DEFAULT_BOOK_GAP = 2; // Default gap between books in pixels

export const SHELF_HEIGHT_CM = 30; // Shelf height in cm

