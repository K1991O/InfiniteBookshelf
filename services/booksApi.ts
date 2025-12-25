import {Book as InternalBook} from '../types/Book';

const GOOGLE_CLOUD_KEY = 'YOUR_GOOGLE_CLOUD_KEY';
const BASE_URL = 'https://www.googleapis.com/books/v1';

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  thumbnail?: string;
  smallThumbnail?: string;
}

export interface BookDetails {
  id: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  dimensions?: {
    height?: string;
    width?: string;
    thickness?: string;
  } | null;
  smallThumbnail?: string;
  thumbnail?: string;
  ISBN10?: string;
  ISBN13?: string;
}

export interface BooksSearchResponse {
  items?: Array<{
    id: string;
    volumeInfo: {
      title: string;
      subtitle?: string;
      authors?: string[];
      imageLinks?: {
        smallThumbnail?: string;
        thumbnail?: string;
      };
    };
  }>;
  totalItems: number;
}

export interface BookDetailsResponse {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    dimensions?: {
      height?: string;
      width?: string;
      thickness?: string;
    };
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export async function searchBooks(query: string): Promise<Book[]> {
  try {
    // Check if query is 10 or more digits (likely an ISBN)
    const isISBN = /^\d{10,}$/.test(query.trim());
    const searchQuery = isISBN ? `isbn:${query.trim()}` : query;

    const response = await fetch(
      `${BASE_URL}/volumes?q=${encodeURIComponent(
        searchQuery,
      )}&key=${GOOGLE_CLOUD_KEY}`,
    );
    const data: BooksSearchResponse = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map(item => ({
      id: item.id,
      title: item.volumeInfo.title,
      subtitle:
        item.volumeInfo.subtitle || item.volumeInfo.authors?.join(', ') || '',
      authors: item.volumeInfo.authors,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail?.replace(
        'http://',
        'https://',
      ),
      smallThumbnail: item.volumeInfo.imageLinks?.smallThumbnail?.replace(
        'http://',
        'https://',
      ),
    }));
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}

export async function getBookDetails(
  bookId: string,
): Promise<BookDetails | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/volumes/${bookId}?key=${GOOGLE_CLOUD_KEY}`,
    );
    const data: BookDetailsResponse = await response.json();

    // Extract ISBN from industryIdentifiers
    let ISBN10: string | undefined;
    let ISBN13: string | undefined;
    if (data.volumeInfo.industryIdentifiers) {
      for (const identifier of data.volumeInfo.industryIdentifiers) {
        if (identifier.type === 'ISBN_10') {
          ISBN10 = identifier.identifier;
        } else if (identifier.type === 'ISBN_13') {
          ISBN13 = identifier.identifier;
        }
      }
    }

    return {
      id: data.id,
      title: data.volumeInfo.title,
      subtitle:
        data.volumeInfo.subtitle || data.volumeInfo.authors?.join(', ') || '',
      authors: data.volumeInfo.authors,
      dimensions: data.volumeInfo.dimensions || null,
      smallThumbnail: data.volumeInfo.imageLinks?.smallThumbnail?.replace(
        'http://',
        'https://',
      ),
      thumbnail: data.volumeInfo.imageLinks?.thumbnail?.replace(
        'http://',
        'https://',
      ),
      ISBN10,
      ISBN13,
    };
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
}

// Helper function to convert API BookDetails to our Book type
export const convertToBook = (
  apiBook: Book,
  details: BookDetails,
): InternalBook => {
  // Parse dimensions from strings (e.g., "20.0 cm" or "20.0") to numbers
  // Returns null if dimension is missing so we can apply specific defaults
  const parseDimension = (dim?: string): number | null => {
    if (!dim) return null;
    const match = dim.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  };

  // Parse each dimension, using null to indicate missing values
  const parsedHeight = parseDimension(details.dimensions?.height);
  const parsedWidth = parseDimension(details.dimensions?.width);
  const parsedThickness = parseDimension(details.dimensions?.thickness);

  // Apply defaults for missing dimensions
  const height = parsedHeight ?? 20.0; // Default height
  const width = parsedWidth ?? 12.7; // Default width (based on sample books)
  const thickness = parsedThickness ?? 2.1; // Default thickness as specified

  return {
    id: `${details.id}-${Date.now()}`, // Unique ID
    googleId: details.id,
    title: details.title,
    author: details.authors?.join(', ') || 'Unknown Author',
    thickness,
    height,
    width,
    smallThumbnail: details.smallThumbnail || apiBook.smallThumbnail || '',
    ISBN10: details.ISBN10,
    ISBN13: details.ISBN13,
  };
};
