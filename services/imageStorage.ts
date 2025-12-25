import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

// Get the app-specific directory for storing spine images
const getSpineImagesDirectory = () => {
  // Use DocumentDirectoryPath for both iOS and Android
  // This is private to the app and persists across app restarts
  return `${RNFS.DocumentDirectoryPath}/spine_images`;
};

// Resolve a stored path (could be relative or absolute) to a usable URI
export function resolveSpineImagePath(path: string | undefined): string | undefined {
  if (!path) return undefined;

  // If it's already an absolute path (legacy), return it as is
  // (but migrate it later in bookStorage)
  if (path.includes(RNFS.DocumentDirectoryPath)) {
    return Platform.OS === 'android' && !path.startsWith('file://')
      ? `file://${path}`
      : path;
  }

  // If it's a relative path (filename only), resolve it
  const fullPath = `${getSpineImagesDirectory()}/${path}`;
  return Platform.OS === 'android' ? `file://${fullPath}` : fullPath;
}

// Ensure the spine images directory exists
export async function ensureSpineImagesDirectory(): Promise<void> {
  try {
    const dir = getSpineImagesDirectory();
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
  } catch (error) {
    console.error('Error creating spine images directory:', error);
    throw error;
  }
}

// Save an image to the app-specific directory
export async function saveSpineImage(
  sourceUri: string,
  bookId: string,
): Promise<string> {
  try {
    // Ensure directory exists
    await ensureSpineImagesDirectory();

    // Remove file:// prefix if present
    const sourcePath = sourceUri.replace('file://', '');

    // Create a unique filename based on bookId and timestamp
    const timestamp = Date.now();
    const extension = sourcePath.split('.').pop() || 'jpg';
    const filename = `spine_${bookId}_${timestamp}.${extension}`;

    // Create destination path
    const destPath = `${getSpineImagesDirectory()}/${filename}`;

    // Copy the file
    await RNFS.copyFile(sourcePath, destPath);

    // Return just the filename for storage
    return filename;
  } catch (error) {
    console.error('Error saving spine image:', error);
    throw error;
  }
}

// Delete a spine image
export async function deleteSpineImage(imageUri: string): Promise<void> {
  try {
    if (!imageUri) return;

    // Remove file:// prefix if present
    const imagePath = imageUri.replace('file://', '');

    // Check if file exists
    const exists = await RNFS.exists(imagePath);
    if (exists) {
      await RNFS.unlink(imagePath);
    }
  } catch (error) {
    console.error('Error deleting spine image:', error);
    // Don't throw - it's okay if deletion fails
  }
}

// Clean up orphaned spine images (images that don't belong to any book)
export async function cleanupOrphanedImages(
  activeImageUris: string[],
): Promise<void> {
  try {
    const dir = getSpineImagesDirectory();
    const exists = await RNFS.exists(dir);
    if (!exists) return;

    // Get all files in the directory
    const files = await RNFS.readDir(dir);

    // Normalize active filenames for comparison
    const activeFilenames = activeImageUris.map(uri => uri.split('/').pop());

    // Delete files that are not in the active list
    for (const file of files) {
      if (!activeFilenames.includes(file.name)) {
        await RNFS.unlink(file.path);
      }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned images:', error);
  }
}
