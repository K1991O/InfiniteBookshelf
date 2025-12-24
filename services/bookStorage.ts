import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { Book } from '../types/Book';

const STORAGE_KEY = '@infinite_bookshelf:books';

export async function saveBook(book: Book): Promise<void> {
  try {
    const existingBooks = await loadBooks();
    // Check if book already exists (by googleId)
    const bookExists = existingBooks.some(b => b.googleId === book.googleId);
    if (!bookExists) {
      const updatedBooks = [...existingBooks, book];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBooks));
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
      return JSON.parse(data);
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
      b.id === updatedBook.id ? updatedBook : b
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

/**
 * Updates book thickness for all books with spine images to match the image aspect ratio
 * This ensures the spine dimensions match the actual spine image proportions
 */
export async function updateBooksWithSpineImageDimensions(): Promise<void> {
  try {
    const books = await loadBooks();
    let hasChanges = false;
    
    const updatedBooks = await Promise.all(
      books.map(async (book) => {
        // Skip books without spine images
        if (!book.spineThumbnail) {
          return book;
        }
        
        try {
          // Get the actual image dimensions
          const { width, height } = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              Image.getSize(
                book.spineThumbnail!,
                (width, height) => resolve({ width, height }),
                (error) => reject(error)
              );
            }
          );
          
          // Calculate aspect ratio (width/height of spine image)
          const aspectRatio = width / height;
          
          // Calculate what the thickness should be based on the image aspect ratio
          const calculatedThickness = aspectRatio * book.height;
          
          // Only update if the thickness differs significantly (more than 0.1cm)
          if (Math.abs(calculatedThickness - book.thickness) > 0.1) {
            console.log(`📐 Updating thickness for "${book.title}":`, {
              oldThickness: book.thickness,
              newThickness: calculatedThickness,
              imageAspectRatio: aspectRatio,
              bookHeight: book.height,
            });
            
            hasChanges = true;
            return {
              ...book,
              thickness: calculatedThickness,
            };
          }
          
          return book;
        } catch (error) {
          console.error(`Error getting dimensions for spine image of "${book.title}":`, error);
          // Return the book unchanged if we can't get dimensions
          return book;
        }
      })
    );
    
    // Only save if there were actual changes
    if (hasChanges) {
      await saveBooks(updatedBooks);
      console.log('✅ Book thicknesses updated based on spine image dimensions');
    }
  } catch (error) {
    console.error('Error updating books with spine image dimensions:', error);
    // Don't throw - we don't want to break app startup if this fails
  }
}



