import AsyncStorage from '@react-native-async-storage/async-storage';
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



