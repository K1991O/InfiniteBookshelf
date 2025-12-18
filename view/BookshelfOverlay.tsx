import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Book } from '../types/Book';
import { BookSpine } from './BookSpine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const FIRST_SHELF_START_PERCENT = 0.17; // 27% down from top
const SHELF_HEIGHT_PERCENT = 0.217; // 21.7% of screen height
const SHELF_SEPERATION_PERCENT = 0.19; // 24.2% of screen height
const CONTAINER_PADDING = 25; // Left and right padding of the container
const CONTAINER_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2); // Actual container width

const SHELF_HEIGHT_TO_WIDTH_RATIO = 0.5
const SHELF_SEPARATION_TO_WIDTH_RATIO= 0.406
const SHELF_START_TO_WIDTH_RATIO= 0.476


interface BookshelfOverlayProps {
  books: Book[];
  patternHeights: number[]; // Heights of each image in the pattern
  totalContentHeight: number; // Total height of all content
  topOffset: number; // Top padding offset
}

interface BookPosition {
  book: Book;
  x: number;
  y: number;
}

export function BookshelfOverlay({ books }: BookshelfOverlayProps) {
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

  // Calculate the actual height needed based on the last book position
  const calculateActualHeight = (): number => {
    if (bookPositions.length === 0) {
      return 0;
    }

    // Find the bottom-most book
    const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
    const lastBook = bookPositions[bookPositions.length - 1];
    const actualBookHeight = (ShelfHeight * lastBook.book.height / 40);
    const bottomY = lastBook.y + actualBookHeight;

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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 4 : 0,
    left: 25,
    right: 25,
  },
  bookContainer: {
    // Individual book positioning handled via inline styles
  },
});
