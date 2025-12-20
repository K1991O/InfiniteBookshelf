import React, { useMemo, memo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Sortable from 'react-native-sortables';
import { Book } from '../types/Book';
import { BookSpine } from './BookSpine';
import { BookSkeleton } from './BookSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const CONTAINER_PADDING = 25;
const CONTAINER_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2);

// Shelf positioning constants (as ratios of screen width)
// You can override these by passing shelfStartOffset and shelfSeparation props
const SHELF_HEIGHT_TO_WIDTH_RATIO = 0.5;        // Height of the shelf area
const SHELF_SEPARATION_TO_WIDTH_RATIO = 0.406;  // Distance between shelves (40.6% of screen width)
const SHELF_START_TO_WIDTH_RATIO = 0.16;       // Starting position of first shelf from top (46.5% of screen width)
const BOOK_SHELF_HEIGHT_IN_CM = 40;             // Physical height reference for book dimensions

// Book item component
interface BookItemProps {
  book: Book;
  bookWidth: number;
  bookHeight: number;
  isSelected: boolean;
  onPress: () => void;
}

const BookItem = memo(({ book, bookWidth, bookHeight, isSelected, onPress }: BookItemProps) => {
  return (
    <View style={[styles.bookWrapper, { width: bookWidth, height: bookHeight }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.bookTouchable,
          isSelected && styles.selectedBook,
        ]}
      >
        <BookSpine book={book} />
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.book.id === nextProps.book.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.bookWidth === nextProps.bookWidth &&
    prevProps.bookHeight === nextProps.bookHeight
  );
});

interface BookshelfOverlayProps {
  books: Book[];
  patternHeights: number[];
  totalContentHeight: number;
  topOffset: number;
  loadingBookCount?: number;
  onBookPress?: (book: Book, index: number) => void;
  selectedBookId?: string | null;
  onBooksReorder?: (reorderedBooks: Book[]) => void;
  // Shelf positioning controls (as % of screen width)
  shelfStartOffset?: number; // % from top where first shelf starts (default: 0.465 = 46.5%)
  shelfSeparation?: number;  // % distance between shelves (default: 0.406 = 40.6%)
}

interface BookWithDimensions extends Book {
  bookWidth: number;
  bookHeight: number;
}

export function BookshelfOverlay({ 
  books, 
  loadingBookCount = 0,
  onBookPress,
  selectedBookId,
  onBooksReorder,
  shelfStartOffset = SHELF_START_TO_WIDTH_RATIO,
  shelfSeparation = SHELF_SEPARATION_TO_WIDTH_RATIO,
}: BookshelfOverlayProps) {
  const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
  
  // Use the configurable shelf positioning
  const firstShelfY = shelfStartOffset * SCREEN_WIDTH;
  const shelfSpacing = shelfSeparation * SCREEN_WIDTH;

  // Calculate book dimensions
  const booksWithDimensions = useMemo<BookWithDimensions[]>(() => {
    return books.map((book) => {
      const bookWidthPx = (book.thickness / BOOK_SHELF_HEIGHT_IN_CM) * ShelfHeight;
      const actualBookHeight = (ShelfHeight * book.height / BOOK_SHELF_HEIGHT_IN_CM);
      return {
        ...book,
        bookWidth: bookWidthPx,
        bookHeight: actualBookHeight,
      };
    });
  }, [books, ShelfHeight]);

  // Handle drag end to update book order
  const handleDragEnd = useCallback(({ order }: any) => {
    if (onBooksReorder) {
      const reordered = order(booksWithDimensions);
      // Remove the temporary dimension properties before calling the callback
      const booksOnly = reordered.map(({ bookWidth, bookHeight, ...book }: BookWithDimensions) => book);
      onBooksReorder(booksOnly as Book[]);
    }
  }, [booksWithDimensions, onBooksReorder]);

  // Calculate total height needed
  const totalHeight = useMemo(() => {
    if (booksWithDimensions.length === 0) return 0;

    // Estimate number of shelves needed
    let currentX = 0;
    let shelvesNeeded = 1;

    for (const book of booksWithDimensions) {
      if (currentX + book.bookWidth > CONTAINER_WIDTH) {
        shelvesNeeded++;
        currentX = 0;
      }
      currentX += book.bookWidth + 2;
    }

    const lastShelfY = firstShelfY + ((shelvesNeeded - 1) * shelfSpacing);
    
    return lastShelfY + (ShelfHeight * 1.5);
  }, [booksWithDimensions, ShelfHeight, firstShelfY, shelfSpacing]);

  // Create loading skeleton items with dimensions
  const skeletonItems = useMemo(() => {
    if (loadingBookCount === 0) return [];

    const defaultThickness = 2.5;
    const defaultHeight = 20;
    const skeletonWidthPx = (defaultThickness / BOOK_SHELF_HEIGHT_IN_CM) * ShelfHeight;
    const skeletonHeight = (ShelfHeight * defaultHeight / BOOK_SHELF_HEIGHT_IN_CM);

    return Array.from({ length: loadingBookCount }, (_, i) => ({
      id: `skeleton-${i}`,
      width: skeletonWidthPx,
      height: skeletonHeight,
      thickness: defaultThickness,
      bookHeight: defaultHeight,
    }));
  }, [loadingBookCount, ShelfHeight]);

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight,
        }
      ]}
      pointerEvents="box-none"
    >
      <Sortable.Flex
        flexDirection="row"
        flexWrap="wrap"
        alignItems="flex-end"
        alignContent="flex-start"
        width={CONTAINER_WIDTH}
        gap={2}
        paddingTop={firstShelfY}
        rowGap={shelfSpacing - ShelfHeight}
        onDragEnd={handleDragEnd}
      >
        {booksWithDimensions.map((book, index) => (
          <BookItem
            key={book.id}
            book={book}
            bookWidth={book.bookWidth}
            bookHeight={book.bookHeight}
            isSelected={selectedBookId === book.id}
            onPress={() => onBookPress?.(book, index)}
          />
        ))}
        {/* Render loading skeletons inline with the books */}
        {skeletonItems.map((skeleton) => (
          <View
            key={skeleton.id}
            style={[
              styles.skeletonWrapper,
              { width: skeleton.width, height: skeleton.height }
            ]}
            pointerEvents="none"
          >
            <BookSkeleton 
              thickness={skeleton.thickness}
              height={skeleton.bookHeight}
            />
          </View>
        ))}
      </Sortable.Flex>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 25,
    right: 25,
  },
  sortableContainer: {
    width: CONTAINER_WIDTH,
  },
  bookWrapper: {
    // Width and height set dynamically based on book dimensions
  },
  bookTouchable: {
    width: '100%',
    height: '100%',
  },
  selectedBook: {
    transform: [{ scale: 1.05 }],
  },
  skeletonWrapper: {
    // Width and height set dynamically based on skeleton dimensions
    // pointerEvents: none prevents interaction
  },
});
