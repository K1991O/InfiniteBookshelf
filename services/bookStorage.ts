import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { Book } from '../types/Book';
import { resolveSpineImagePath } from './imageStorage';
import RNFS from 'react-native-fs';

const STORAGE_KEY = '@infinite_bookshelf:books';
const TIER_CONFIG_KEY = '@infinite_bookshelf:tier_config';

export interface TierConfig {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_TIERS: TierConfig[] = [
  { id: 'S', label: 'S', color: '#FF7F7F' },
  { id: 'A', label: 'A', color: '#FFBF7F' },
  { id: 'B', label: 'B', color: '#FFFF7F' },
  { id: 'C', label: 'C', color: '#7FFF7F' },
  { id: 'D', label: 'D', color: '#7F7FFF' },
];

export async function loadTierConfig(): Promise<TierConfig[]> {
  try {
    const config = await AsyncStorage.getItem(TIER_CONFIG_KEY);
    return config ? JSON.parse(config) : DEFAULT_TIERS;
  } catch (error) {
    console.error('Error loading tier config:', error);
    return DEFAULT_TIERS;
  }
}

export async function saveTierConfig(config: TierConfig[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TIER_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving tier config:', error);
  }
}

export async function saveBook(book: Book): Promise<string> {
  try {
    const existingBooks = await loadBooks();
    // Check if book already exists (by googleId)
    const existingIndex = existingBooks.findIndex(
      b => b.googleId === book.googleId,
    );
    if (existingIndex === -1) {
      const updatedBooks = [...existingBooks, book];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
      return book.id;
    } else {
      // If it exists, return the existing book's ID
      return existingBooks[existingIndex].id;
    }
  } catch (error) {
    console.error('Error saving book:', error);
    throw error;
  }
}

export async function loadBooks(): Promise<Book[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const books: Book[] = JSON.parse(data);
      let migrated = false;

      // Migrate absolute paths to relative filename-only paths
      const migratedBooks = books.map(book => {
        if (book.spineThumbnail && book.spineThumbnail.includes(RNFS.DocumentDirectoryPath)) {
          migrated = true;
          const filename = book.spineThumbnail.split('/').pop() || '';
          return { ...book, spineThumbnail: filename };
        }
        return book;
      });

      if (migrated) {
        await saveBooks(migratedBooks);
      }

      return migratedBooks;
    }
    return [];
  } catch (error) {
    console.error('Error loading books:', error);
    return [];
  }
}

export async function removeBook(bookId: string): Promise<void> {
  try {
    const existingBooks = await loadBooks();
    const updatedBooks = existingBooks.filter(b => b.id !== bookId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
  } catch (error) {
    console.error('Error removing book:', error);
    throw error;
  }
}

export async function updateBook(updatedBook: Book): Promise<void> {
  try {
    const existingBooks = await loadBooks();
    const updatedBooks = existingBooks.map(b =>
      b.id === updatedBook.id ? updatedBook : b,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

export async function clearBooks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing books:', error);
    throw error;
  }
}

export async function saveBooks(books: Book[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error('Error saving books:', error);
    throw error;
  }
}

export async function getBookById(bookId: string): Promise<Book | undefined> {
  try {
    const books = await loadBooks();
    return books.find(b => b.id === bookId);
  } catch (error) {
    console.error('Error getting book by ID:', error);
    return undefined;
  }
}


/**
 * Calculates the appropriate thickness for a book based on its spine image's aspect ratio.
 */
export async function calculateThicknessFromImage(
  imagePath: string,
  bookHeight: number,
): Promise<number | null> {
  try {
    const resolvedPath = resolveSpineImagePath(imagePath);
    if (!resolvedPath) return null;

    const { width, height } = await new Promise<{
      width: number;
      height: number;
    }>((resolve, reject) => {
      Image.getSize(
        resolvedPath,
        (w, h) => resolve({ width: w, height: h }),
        error => reject(error),
      );
    });

    const aspectRatio = width / height;
    return aspectRatio * bookHeight;
  } catch (error) {
    console.error('Error calculating thickness from image:', error);
    return null;
  }
}

/**
 * Updates book thickness for all books with spine images to match the image aspect ratio
 */
export async function updateBooksWithSpineImageDimensions(): Promise<void> {
  try {
    const books = await loadBooks();
    let hasChanges = false;

    const updatedBooks = await Promise.all(
      books.map(async book => {
        if (!book.spineThumbnail) return book;

        const calculatedThickness = await calculateThicknessFromImage(
          book.spineThumbnail,
          book.height,
        );

        if (
          calculatedThickness !== null &&
          Math.abs(calculatedThickness - book.thickness) > 0.1
        ) {
          hasChanges = true;
          return { ...book, thickness: calculatedThickness };
        }
        return book;
      }),
    );

    if (hasChanges) {
      await saveBooks(updatedBooks);
    }
  } catch (error) {
    console.error('Error updating books with spine image dimensions:', error);
  }
}
