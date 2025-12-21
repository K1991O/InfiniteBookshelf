import React, { useState, useEffect } from 'react';
import { View, Image, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles/Main';
import { BookshelfOverlay } from './BookshelfOverlay';
import { Book } from '../types/Book';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Generate a large array of items for infinite scrolling
const generateItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({ id: i.toString() }));
};

const ITEM_COUNT = 5; // Large enough to feel infinite
const NAV_BAR_HEIGHT = 44;

interface LibraryViewProps {
  onScroll: any;
  refreshTrigger?: number; // Increment this to trigger refresh
  loadingBookCount?: number; // Number of books currently loading
  onBookPress?: (book: Book, index: number) => void;
  selectedBookId?: string | null;
  books: Book[];
  onBooksReorder: (books: Book[]) => void;
  scrollProgress?: number | undefined; // Scroll offset from BookDetailSheet for smooth scaling (undefined when sheet is closed)
}

export function LibraryView({ 
  onScroll, 
  refreshTrigger, 
  loadingBookCount = 0,
  onBookPress,
  selectedBookId,
  books,
  onBooksReorder,
  scrollProgress,
}: LibraryViewProps) {
  const insets = useSafeAreaInsets();
  
  // Pattern: one Library_4, three Library_2, one Library_2end
  const imagePatternThick = [
    require('../assets/library_4.jpg'),
    require('../assets/library_2.jpg'),
    require('../assets/library_2.jpg'),
    require('../assets/library_2.jpg'),
    require('../assets/library_2end.jpg'),
  ];

  const imagePatternThin = [
    require('../assets/library_4thin.jpg'),
    require('../assets/library_2thin.jpg'),
    require('../assets/library_2thin.jpg'),
    require('../assets/library_2thin.jpg'),
    require('../assets/library_2endThin.jpg'),
  ];

  const imagePattern = imagePatternThin;

  const [patternHeights, setPatternHeights] = useState<number[]>([700, 300, 300, 300, 300]);
  const [imageStyles, setImageStyles] = useState<any[]>([]);

  // Load image dimensions and calculate heights
  useEffect(() => {
    const loadImageDimensions = async () => {
      const heights: number[] = [];
      const stylesArray: any[] = [];

      for (let i = 0; i < imagePattern.length; i++) {
        const imageSource = Image.resolveAssetSource(imagePattern[i]);
        try {
          await new Promise<void>((resolve) => {
            Image.getSize(
              imageSource.uri,
              (width, height) => {
                // Calculate height based on screen width to maintain aspect ratio
                const calculatedHeight = (height / width) * SCREEN_WIDTH;
                heights.push(calculatedHeight);
                stylesArray.push({
                  width: SCREEN_WIDTH,
                  height: calculatedHeight,
                });
                resolve();
              },
              () => {
                // Fallback to default height if image loading fails
                const defaultHeight = i === 0 ? 700 : 300;
                heights.push(defaultHeight);
                stylesArray.push({
                  width: SCREEN_WIDTH,
                  height: defaultHeight,
                });
                resolve();
              }
            );
          });
        } catch (error) {
          // Fallback to default height
          const defaultHeight = i === 0 ? 700 : 300;
          heights.push(defaultHeight);
          stylesArray.push({
            width: SCREEN_WIDTH,
            height: defaultHeight,
          });
        }
      }

      setPatternHeights(heights);
      setImageStyles(stylesArray);
    };

    loadImageDimensions();
  }, []);

  // Calculate cumulative offset for an item at a given index
  const getItemOffset = (index: number): number => {
    const patternLength = patternHeights.length;
    const fullPatterns = Math.floor(index / patternLength);
    const patternIndex = index % patternLength;
    
    // Sum of all heights in one pattern
    const patternTotalHeight = patternHeights.reduce((sum, height) => sum + height, 0);
    
    // Offset from full patterns
    const fullPatternsOffset = fullPatterns * patternTotalHeight;
    
    // Offset within the current pattern
    const patternOffset = patternHeights.slice(0, patternIndex).reduce((sum, height) => sum + height, 0);
    
    return fullPatternsOffset + patternOffset;
  };

  const renderLibraryItem = ({ item, index }: { item: { id: string }, index: number }) => {
    const imageIndex = index % imagePattern.length;
    const imageSource = imagePattern[imageIndex];
    const itemStyle = imageStyles[imageIndex] || {
      width: SCREEN_WIDTH,
      height: patternHeights[imageIndex] || 300,
    };

    // Only render the overlay on the first item
    const shouldRenderOverlay = index === 0;

    return (
      <View>
        <Image
          source={imageSource}
          style={itemStyle}
          resizeMode="cover"
        />
        {shouldRenderOverlay && (
          <BookshelfOverlay 
            books={books}
            patternHeights={patternHeights}
            totalContentHeight={totalContentHeight}
            topOffset={0}
            loadingBookCount={loadingBookCount}
            onBookPress={onBookPress}
            selectedBookId={selectedBookId}
            onBooksReorder={onBooksReorder}
            scrollProgress={scrollProgress}
          />
        )}
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => {
    const imageIndex = index % patternHeights.length;
    const itemHeight = patternHeights[imageIndex];
    const offset = getItemOffset(index);
    
    return {
      length: itemHeight,
      offset: offset,
      index,
    };
  };

  // Calculate total content height for all items
  const totalContentHeight = patternHeights.reduce((sum, height) => sum + height, 0) * ITEM_COUNT;

  return (
    <View style={styles.container}>
      <FlatList
        data={generateItems(ITEM_COUNT)}
        renderItem={renderLibraryItem}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={3}
        windowSize={5}
        style={styles.list}
        contentContainerStyle={{
          paddingTop: insets.top + NAV_BAR_HEIGHT,
        }}
      />
    </View>
  );
}
