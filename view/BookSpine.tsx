import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { Book, SHELF_HEIGHT_CM } from '../types/Book';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for positioning - must match BookshelfOverlay
const SHELF_HEIGHT_TO_WIDTH_RATIO = 0.5;

interface BookSpineProps {
  book: Book;
  width?: number; // Optional: if provided, use this instead of calculating
  height?: number; // Optional: if provided, use this instead of calculating
}

export const BookSpine = memo(({ book, width: providedWidth, height: providedHeight }: BookSpineProps) => {
  // Memoize calculations to avoid recalculating on every render
  const { bookWidthPx, actualBookHeight, fontSize, backgroundColor } = useMemo(() => {
    // Use provided dimensions if available, otherwise calculate
    let width: number;
    let height: number;
    
    if (providedWidth !== undefined && providedHeight !== undefined) {
      // Use provided dimensions from parent (BookshelfOverlay)
      width = providedWidth;
      height = providedHeight;
    } else {
      // Fallback: Calculate dimensions - must match BookshelfOverlay calculation
      // Use SCREEN_WIDTH * ratio to match positioning logic
      const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
      
      // Calculate width based on the book's thickness relative to shelf height
      // If shelf is 40cm, and book thickness is, say, 2.1cm, 
      // then width = (2.1 / 40) * ShelfHeight
      width = (book.thickness / SHELF_HEIGHT_CM) * ShelfHeight;
      
      // Calculate actual book height
      height = (ShelfHeight * book.height / SHELF_HEIGHT_CM);
    }
    
    // Calculate dynamic font size based on book height AND title length
    // Start with a base size from book height
    const baseFontSize = height * 0.08;
    
    // Adjust based on title length - longer titles need smaller fonts
    const titleLength = book.title.length;
    let lengthFactor = 1;
    if (titleLength > 40) {
      lengthFactor = 0.7; // Very long titles
    } else if (titleLength > 25) {
      lengthFactor = 0.85; // Long titles
    } else if (titleLength > 15) {
      lengthFactor = 0.95; // Medium titles
    } else if (titleLength > 10) {
      lengthFactor = 1.05; // Short titles
    } else {
      lengthFactor = 1.1; // Very short titles
    }
    
    // Apply length factor and clamp between 6 and 12
    const size = Math.max(6, Math.min(12, baseFontSize * lengthFactor));

    // Use gray color if no spine thumbnail is available
    const bgColor = book.spineThumbnail ? undefined : '#D9D9D9';
    
    return {
      bookWidthPx: width,
      actualBookHeight: height,
      fontSize: size,
      backgroundColor: bgColor,
    };
  }, [book.thickness, book.height, book.title.length, book.spineThumbnail, providedWidth, providedHeight]);

  return (
    <View
      style={[
        styles.bookSpine,
        {
          width: bookWidthPx,
          height: actualBookHeight,
          backgroundColor: backgroundColor,
        },
      ]}
    >
      {book.spineThumbnail ? (
        <Image
          source={{ uri: book.spineThumbnail }}
          style={[
            styles.spineImage,
            {
              width: bookWidthPx,
              height: actualBookHeight,
            }
          ]}
          resizeMode="cover"
        />
      ) : (
        <View style={[
          styles.textContainer,
          {
            width: actualBookHeight, // After rotation, this becomes the height
            height: bookWidthPx, // After rotation, this becomes the width
          }
        ]}>
          <Text style={[styles.title, { fontSize }]} numberOfLines={1} ellipsizeMode="tail">
            {book.title}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bookSpine: {
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  spineImage: {
    borderRadius: 2,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    transform: [{ rotate: '90deg' }],
    height: 50
  },
  title: {
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    textShadowColor: 'rgba(175, 175, 175, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  author: {
    fontSize: 8,
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
