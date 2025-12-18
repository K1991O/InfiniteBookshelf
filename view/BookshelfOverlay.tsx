import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Book } from '../types/Book';
import { BookSpine } from './BookSpine';
import { BookSkeleton } from './BookSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const CONTAINER_PADDING = 25; // Left and right padding of the container
const CONTAINER_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2); // Actual container width

const SHELF_HEIGHT_TO_WIDTH_RATIO = 0.5
const SHELF_SEPARATION_TO_WIDTH_RATIO= 0.406
const SHELF_START_TO_WIDTH_RATIO= 0.465


interface BookshelfOverlayProps {
  books: Book[];
  patternHeights: number[]; // Heights of each image in the pattern
  totalContentHeight: number; // Total height of all content
  topOffset: number; // Top padding offset
  loadingBookCount?: number; // Number of books currently loading (to show skeletons)
}

interface BookPosition {
  book: Book;
  x: number;
  y: number;
}

export function BookshelfOverlay({ books, loadingBookCount = 0 }: BookshelfOverlayProps) {
  // Calculate how many shelves we need based on book count
  const estimateRequiredShelves = (): number => {
    const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
    let currentX = 0;
    let shelvesNeeded = 1;

    for (const book of books) {
      const bookWidthPx = (book.thickness / 40) * ShelfHeight;

      // If book would overflow the container, wrap to next shelf
      if (currentX + bookWidthPx > CONTAINER_WIDTH) {
        shelvesNeeded++;
        currentX = 0;
      }
      currentX += bookWidthPx + 2;
    }

    return shelvesNeeded;
  };

  // Calculate all shelf positions - simplified and uniform
  const calculateShelfPositions = (): number[] => {
    const shelfPositions: number[] = [];
    const shelfSpacing = SHELF_SEPARATION_TO_WIDTH_RATIO * SCREEN_WIDTH;

    // First shelf: positioned at FIRST_SHELF_START_PERCENT from top
    const firstShelfY = SHELF_START_TO_WIDTH_RATIO * SCREEN_WIDTH;
    shelfPositions.push(firstShelfY);

    // All subsequent shelves: uniformly spaced
    const requiredShelves = estimateRequiredShelves();
    for (let i = 1; i < requiredShelves; i++) {
      const shelfY = firstShelfY + (i * shelfSpacing);
      shelfPositions.push(shelfY);
    }

    return shelfPositions;
  };

  // Calculate book positions with wrapping
  const calculateBookPositions = (): BookPosition[] => {
    const positions: BookPosition[] = [];
    const shelfPositions = calculateShelfPositions();
    let currentX = 0;
    let currentShelfIndex = 0;
    const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;

    for (const book of books) {
      // Calculate book width based on thickness
      const bookWidthPx = (book.thickness / 40) * ShelfHeight;

      // Check if book would overflow the container - if so, wrap to next shelf
      if (currentX + bookWidthPx > CONTAINER_WIDTH) {
        // Move to next shelf
        currentShelfIndex++;
        currentX = 0;
      }

      // Calculate the actual height of this specific book
      const actualBookHeight = (ShelfHeight * book.height / 40);

      // Get shelf Y position and calculate book top position
      const shelfY = shelfPositions[currentShelfIndex];
      const y = shelfY - actualBookHeight;

      positions.push({
        book,
        x: currentX,
        y,
      });

      currentX += bookWidthPx + 2; // Add small gap between books
    }

    return positions;
  };

  const bookPositions = calculateBookPositions();

  // Calculate positions for loading skeletons
  const calculateLoadingSkeletonPositions = (): BookPosition[] => {
    if (loadingBookCount === 0) return [];
    
    const skeletonPositions: BookPosition[] = [];
    const shelfPositions = calculateShelfPositions();
    const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
    
    // Default skeleton dimensions
    const defaultThickness = 2.5;
    const defaultHeight = 20;
    const skeletonWidthPx = (defaultThickness / 40) * ShelfHeight;
    const skeletonHeight = (ShelfHeight * defaultHeight / 40);
    
    // Start from the last book position, or start of first shelf if no books
    let currentX = 0;
    let currentShelfIndex = 0;
    
    if (bookPositions.length > 0) {
      const lastPosition = bookPositions[bookPositions.length - 1];
      const lastBookWidthPx = (lastPosition.book.thickness / 40) * ShelfHeight;
      currentX = lastPosition.x + lastBookWidthPx + 2;
      
      // Find which shelf this book is on by finding the closest shelf below the book
      // Books are positioned above the shelf, so we look for the shelf that's just below the book's bottom
      const lastBookHeight = (ShelfHeight * lastPosition.book.height / 40);
      const lastBookBottom = lastPosition.y + lastBookHeight;
      
      // Find the shelf index - the shelf Y should be just above or equal to the book's bottom
      for (let i = shelfPositions.length - 1; i >= 0; i--) {
        if (shelfPositions[i] <= lastBookBottom) {
          currentShelfIndex = i;
          break;
        }
      }
      
      // Check if we need to wrap to next shelf
      if (currentX + skeletonWidthPx > CONTAINER_WIDTH) {
        currentShelfIndex++;
        currentX = 0;
      }
    }
    
    for (let i = 0; i < loadingBookCount; i++) {
      // Check if skeleton would overflow the container
      if (currentX + skeletonWidthPx > CONTAINER_WIDTH) {
        currentShelfIndex++;
        currentX = 0;
      }
      
      const shelfY = shelfPositions[currentShelfIndex] || shelfPositions[0];
      const y = shelfY - skeletonHeight;
      
      // Create a placeholder book for positioning
      const placeholderBook: Book = {
        id: `loading-${i}`,
        googleId: '',
        title: '',
        author: '',
        thickness: defaultThickness,
        height: defaultHeight,
        width: 12.7,
        smallThumbnail: '',
      };
      
      skeletonPositions.push({
        book: placeholderBook,
        x: currentX,
        y,
      });
      
      currentX += skeletonWidthPx + 2;
    }
    
    return skeletonPositions;
  };

  const loadingSkeletonPositions = calculateLoadingSkeletonPositions();

  // Calculate the actual height needed based on the last book position
  const calculateActualHeight = (): number => {
    const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
    
    // Check both regular books and loading skeletons
    const allPositions = [...bookPositions, ...loadingSkeletonPositions];
    
    if (allPositions.length === 0) {
      return 0;
    }

    // Find the bottom-most item
    const lastItem = allPositions[allPositions.length - 1];
    const actualItemHeight = (ShelfHeight * lastItem.book.height / 40);
    const bottomY = lastItem.y + actualItemHeight;

    // Add some padding at the bottom
    const minHeight = bottomY + (ShelfHeight * 0.5);

    // Return the greater of calculated height or totalContentHeight
    return Math.max(minHeight, 0);
  };

  const actualHeight = calculateActualHeight();

  return (
    <>
      <View
        style={[
          styles.container,
          {
            height: actualHeight,
          }
        ]}
        pointerEvents="none"
      >
        {bookPositions.map((position, index) => (
          <View
            key={`${position.book.id}-${index}`}
            style={[
              styles.bookContainer,
              {
                position: 'absolute',
                left: position.x,
                top: position.y,
              },
            ]}
          >
            <BookSpine book={position.book} />
          </View>
        ))}
        {loadingSkeletonPositions.map((position, index) => (
          <View
            key={`loading-skeleton-${index}`}
            style={[
              styles.bookContainer,
              {
                position: 'absolute',
                left: position.x,
                top: position.y,
              },
            ]}
          >
            <BookSkeleton 
              thickness={position.book.thickness}
              height={position.book.height}
            />
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 25,
    right: 25,
  },
  bookContainer: {
    // Individual book positioning handled via inline styles
  },
});
