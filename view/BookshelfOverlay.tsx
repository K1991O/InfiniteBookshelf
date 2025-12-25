import React, { useMemo, memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Sortable from 'react-native-sortables';
import { Book } from '../types/Book';
import { BookSpine } from './BookSpine';
import { BookSkeleton } from './BookSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout constants
const PADDING = 34;
const CONTAINER_WIDTH = SCREEN_WIDTH - PADDING * 2;

// Shelf layout (as ratios of screen width)
// //THICK
// const SHELF_HEIGHT_RATIO = 0.37;        // Shelf height as % of screen width (limits book height)
// const SHELF_SPACING_RATIO = 0.406;     // Gap between shelves
// const SHELF_START_RATIO = 0.46;       // First shelf position from top
// const DEFAULT_BOOK_GAP = 2;            // Default gap between books in pixels

//THIN
const SHELF_HEIGHT_RATIO = 0.62; // Shelf height as % of screen width (limits book height)
const SHELF_SPACING_RATIO = 0.69; // Gap between shelves
const SHELF_START_RATIO = 0.76; // First shelf position from top
const DEFAULT_BOOK_GAP = 2; // Default gap between books in pixels

// Shelf scale in cm - controls book size
// Higher values = smaller books (same pixel height represents more cm)
// Lower values = larger books (same pixel height represents fewer cm)
const SHELF_HEIGHT_CM = 30; // Shelf height in cm (affects book scale/aspect ratio)

// Book item component
interface BookItemProps {
  book: Book;
  bookWidth: number;
  bookHeight: number;
  isSelected: boolean;
  onPress: () => void;
  bookGap: number;
  scale: number;
}

const BookItem = memo(
  ({
    book,
    bookWidth,
    bookHeight,
    isSelected: _isSelected,
    onPress,
    bookGap,
    scale,
  }: BookItemProps) => {
    const animatedScale = useRef(new Animated.Value(1.0)).current;

    useEffect(() => {
      Animated.spring(animatedScale, {
        toValue: scale,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }, [scale, animatedScale]);

    return (
      <View
        style={[styles.bookWrapper, { width: bookWidth, marginRight: bookGap }]}>
        <Animated.View
          style={[
            styles.bookTouchable,
            {
              position: 'absolute',
              bottom: 0,
              height: bookHeight,
              width: bookWidth,
              transform: [{ scale: animatedScale }],
            },
          ]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={{
              height: bookHeight,
              width: bookWidth,
            }}>
            <BookSpine book={book} width={bookWidth} height={bookHeight} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.book.id === nextProps.book.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.bookWidth === nextProps.bookWidth &&
      prevProps.bookHeight === nextProps.bookHeight &&
      prevProps.bookGap === nextProps.bookGap &&
      Math.abs(prevProps.scale - nextProps.scale) < 0.001 // Only re-render if scale changes significantly
    );
  },
);

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
  shelfStartOffset?: number; // % from top where first shelf starts
  shelfSeparation?: number; // % distance between shelves
  // Book spacing
  bookGap?: number; // Gap between books in pixels (0 = touching, -1 = merged, 2 = 2px gap)
  // Debug visualization
  showDebugLayers?: boolean; // Show opaque layers to visualize ratios
  // Scroll progress for smooth scaling
  scrollProgress?: number | undefined; // Scroll offset from BookDetailSheet (undefined when sheet is closed)
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
  shelfStartOffset = SHELF_START_RATIO,
  shelfSeparation = SHELF_SPACING_RATIO,
  bookGap = DEFAULT_BOOK_GAP,
  showDebugLayers = false,
  scrollProgress,
}: BookshelfOverlayProps) {
  // Calculate shelf dimensions
  const shelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_RATIO;
  const firstShelfY = shelfStartOffset * SCREEN_WIDTH;
  const shelfSpacing = shelfSeparation * SCREEN_WIDTH;

  // Calculate book dimensions
  // Books are scaled to fit within shelf height while maintaining aspect ratio
  const booksWithDimensions = useMemo<BookWithDimensions[]>(() => {
    return books.map(book => {
      // Calculate pixels per cm: shelfHeight pixels = SHELF_HEIGHT_CM cm
      const pixelsPerCm = shelfHeight / SHELF_HEIGHT_CM;

      // Calculate book dimensions in pixels
      let bookHeightPx = book.height * pixelsPerCm;
      let bookWidthPx = book.thickness * pixelsPerCm;

      // If book exceeds shelf height, scale down proportionally while maintaining aspect ratio
      if (bookHeightPx > shelfHeight) {
        const scaleFactor = shelfHeight / bookHeightPx;
        bookHeightPx = shelfHeight; // Clamp to shelf height
        bookWidthPx = bookWidthPx * scaleFactor; // Scale width proportionally
      }

      return {
        ...book,
        bookWidth: bookWidthPx,
        bookHeight: bookHeightPx,
      };
    });
  }, [books, shelfHeight]);

  // Handle drag end to update book order
  const handleDragEnd = useCallback(
    ({ order }: any) => {
      if (onBooksReorder) {
        const reordered = order(booksWithDimensions);
        // Remove the temporary dimension properties before calling the callback
        const booksOnly = reordered.map(
          ({ bookWidth: _bw, bookHeight: _bh, ...book }: BookWithDimensions) =>
            book,
        );
        onBooksReorder(booksOnly as Book[]);
      }
    },
    [booksWithDimensions, onBooksReorder],
  );

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
      currentX += book.bookWidth + bookGap;
    }

    const lastShelfY = firstShelfY + (shelvesNeeded - 1) * shelfSpacing;

    return lastShelfY + shelfHeight * 1.5;
  }, [booksWithDimensions, shelfHeight, firstShelfY, shelfSpacing, bookGap]);

  // Create loading skeleton items with dimensions
  const skeletonItems = useMemo(() => {
    if (loadingBookCount === 0) return [];

    const defaultThickness = 3;
    const defaultHeight = 20;

    // Use same calculation as books to maintain consistency
    const pixelsPerCm = shelfHeight / SHELF_HEIGHT_CM;
    let skeletonHeight = defaultHeight * pixelsPerCm;
    let skeletonWidth = defaultThickness * pixelsPerCm;

    // Scale down if exceeds shelf height
    if (skeletonHeight > shelfHeight) {
      const scaleFactor = shelfHeight / skeletonHeight;
      skeletonHeight = shelfHeight;
      skeletonWidth = skeletonWidth * scaleFactor;
    }

    return Array.from({ length: loadingBookCount }, (_, i) => ({
      id: `skeleton-${i}`,
      width: skeletonWidth,
      height: skeletonHeight,
      thickness: defaultThickness,
      bookHeight: defaultHeight,
    }));
  }, [loadingBookCount, shelfHeight]);

  // Calculate scale for each book based on scroll progress
  const bookScales = useMemo(() => {
    if (books.length === 0) return [];

    // If scrollProgress is undefined, detail sheet is closed - use selectedBookId
    if (scrollProgress === undefined) {
      if (selectedBookId) {
        // Detail sheet closed: scale up the selected book
        return books.map(book => {
          return selectedBookId === book.id ? 1.05 : 1.0;
        });
      }
      // No selection: all books at normal scale
      return books.map(() => 1.0);
    }

    // Detail sheet open: calculate scale based on scroll position
    const currentIndex = scrollProgress / SCREEN_WIDTH;

    return books.map((_, index) => {
      // Distance from current scroll position to this book's position
      const distance = Math.abs(currentIndex - index);

      // Scale from 1.0 (far) to 1.05 (selected)
      // Use a smooth curve: scale down quickly as distance increases
      const maxDistance = 0.5; // Distance at which scale reaches 1.0
      const scaleFactor = Math.max(0, 1 - distance / maxDistance);
      const scale = 1.0 + 0.05 * scaleFactor;

      return scale;
    });
  }, [scrollProgress, books, selectedBookId]);

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight,
        },
      ]}
      pointerEvents="box-none">
      {/* Debug visualization layers */}
      {showDebugLayers && (
        <>
          {/* Shelf height indicator - starts at end of blue and goes up */}
          <View
            style={[
              styles.debugLayer,
              styles.debugShelfHeight,
              {
                top: firstShelfY - shelfHeight,
                height: shelfHeight,
                width: CONTAINER_WIDTH,
              },
            ]}
            pointerEvents="none"
          />
          {/* Shelf spacing indicator (gap between shelves) - starts where blue ends */}
          <View
            style={[
              styles.debugLayer,
              styles.debugShelfSpacing,
              {
                top: firstShelfY,
                height: shelfSpacing,
                width: CONTAINER_WIDTH,
              },
            ]}
            pointerEvents="none"
          />
          {/* First shelf start position indicator */}
          <View
            style={[
              styles.debugLayer,
              styles.debugShelfStart,
              {
                top: 0,
                height: firstShelfY,
                width: CONTAINER_WIDTH,
              },
            ]}
            pointerEvents="none"
          />
        </>
      )}

      <Sortable.Flex
        flexDirection="row"
        flexWrap="wrap"
        alignItems="flex-end"
        alignContent="flex-start"
        width={CONTAINER_WIDTH}
        paddingTop={firstShelfY}
        rowGap={shelfSpacing}
        onDragEnd={handleDragEnd}>
        {booksWithDimensions.map(book => {
          // Find the index by book ID to ensure correct index even after reordering
          const index = books.findIndex(b => b.id === book.id);
          const scale =
            index >= 0 && index < bookScales.length ? bookScales[index] : 1.0;
          return (
            <BookItem
              key={book.id}
              book={book}
              bookWidth={book.bookWidth}
              bookHeight={book.bookHeight}
              isSelected={selectedBookId === book.id}
              onPress={() => onBookPress?.(book, index >= 0 ? index : 0)}
              bookGap={bookGap}
              scale={scale}
            />
          );
        })}
        {/* <View style={{ backgroundColor: 'red', width: 10, height: 100 }} />
        <View style={{ backgroundColor: 'green', width: 10, height: 100 }} />         */}
        {skeletonItems.map(skeleton => (
          <View
            key={skeleton.id}
            style={[
              styles.bookWrapper,
              { width: skeleton.width, marginRight: bookGap },
            ]}
            pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                height: skeleton.height,
                width: skeleton.width,
              }}>
              <BookSkeleton
                width={skeleton.width}
                pixelHeight={skeleton.height}
              />
            </View>
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
    left: PADDING,
    right: PADDING,
  },
  bookWrapper: {
    height: 0, // Zero height so it doesn't affect vertical spacing
    position: 'relative',
    overflow: 'visible', // Allow content to extend beyond wrapper (books are absolutely positioned)
  },
  bookTouchable: {
    // Width is set inline to match bookWidth exactly
  },
  selectedBook: {
    transform: [{ scale: 1.05 }],
  },
  // Debug visualization layers
  debugLayer: {
    position: 'absolute',
    left: 0,
  },
  debugShelfHeight: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)', // Red: shelf height
  },
  debugShelfSpacing: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green: spacing between shelves
  },
  debugShelfStart: {
    backgroundColor: 'rgba(0, 0, 255, 0.2)', // Blue: space before first shelf
  },
});
