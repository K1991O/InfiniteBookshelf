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
      `${BASE_URL}/volumes?q=${encodeURIComponent(searchQuery)}&key=${GOOGLE_CLOUD_KEY}`
    );
    const data: BooksSearchResponse = await response.json();
    
    if (!data.items) {
      return [];
    }
    
    return data.items.map((item) => ({
      id: item.id,
      title: item.volumeInfo.title,
      subtitle: item.volumeInfo.subtitle || item.volumeInfo.authors?.join(', ') || '',
      authors: item.volumeInfo.authors,
      thumbnail: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
      smallThumbnail: item.volumeInfo.imageLinks?.smallThumbnail?.replace('http://', 'https://'),
    }));
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}

export async function getBookDetails(bookId: string): Promise<BookDetails | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/volumes/${bookId}?key=${GOOGLE_CLOUD_KEY}`
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
      subtitle: data.volumeInfo.subtitle || data.volumeInfo.authors?.join(', ') || '',
      authors: data.volumeInfo.authors,
      dimensions: data.volumeInfo.dimensions || null,
      smallThumbnail: data.volumeInfo.imageLinks?.smallThumbnail?.replace('http://', 'https://'),
      thumbnail: data.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
      ISBN10,
      ISBN13,
    };
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
}



