/**
 * Infinite Bookshelf App
 *
 * @format
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StatusBar, View, Platform, Animated, Dimensions } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { styles } from './view/styles/Main';
import { LibraryView } from './view/LibraryView';
import { NavigationBar } from './view/NavigationBar';
import { BottomTabBar } from './view/BottomTabBar';
import { FloatingActionButton } from './view/FloatingActionButton';
import { BookSearchSheet } from './view/BookSearchSheet';
import { BookDetailSheet } from './view/BookDetailSheet';
import { Book } from './types/Book';
import { loadBooks, saveBooks } from './services/bookStorage';

function App() {
  const [isSearchSheetVisible, setIsSearchSheetVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingBookCount, setLoadingBookCount] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const isScrollingDown = useRef(false);
  const isVisible = useRef(true);

  // Load books from storage
  const loadBooksFromStorage = useCallback(async () => {
    try {
      const savedBooks = await loadBooks();
      setBooks(savedBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }, []);

  // Load books on mount and when refreshTrigger changes
  useEffect(() => {
    loadBooksFromStorage();
  }, [loadBooksFromStorage, refreshTrigger]);

  const handleBookAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setLoadingBookCount(0);
  };

  const handleBookAdding = () => {
    setLoadingBookCount(1);
  };

  const handleBookPress = useCallback((book: Book, index: number) => {
    setSelectedBookId(book.id);
    // Initialize scroll progress to the selected book's position
    const bookIndex = books.findIndex(b => b.id === book.id);
    if (bookIndex >= 0) {
      const { width: SCREEN_WIDTH } = Dimensions.get('window');
      setScrollProgress(bookIndex * SCREEN_WIDTH);
    }
    setIsDetailSheetVisible(true);
  }, [books]);

  const handleBookChange = useCallback((index: number) => {
    if (index >= 0 && index < books.length) {
      setSelectedBookId(books[index]?.id || null);
    }
  }, [books]);

  const handleDetailSheetClose = useCallback(() => {
    setIsDetailSheetVisible(false);
    setSelectedBookId(null);
    setScrollProgress(0);
  }, []);

  const handleBookDeleted = useCallback(() => {
    // Clear the selected book
    setSelectedBookId(null);
    setIsDetailSheetVisible(false);
    
    // Trigger refresh to reload books and recalculate positions
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleBookUpdated = useCallback(() => {
    // Trigger refresh to reload books and update UI
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleScrollProgress = useCallback((offset: number) => {
    setScrollProgress(offset);
  }, []);


  const handleBooksReorder = useCallback(async (reorderedBooks: Book[]) => {
    try {
      await saveBooks(reorderedBooks);
      setBooks(reorderedBooks);
      // No need to update selectedBookId - it remains the same since we're tracking by ID
    } catch (error) {
      console.error('Error saving reordered books:', error);
    }
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const threshold = 10; // Minimum scroll distance to trigger hide/show

        if (currentScrollY < threshold) {
          // At top, always show
          if (!isVisible.current) {
            isVisible.current = true;
            Animated.spring(scrollDirection, {
              toValue: 1,
              useNativeDriver: false,
            }).start();
          }
        } else {
          const scrollingDown = currentScrollY > lastScrollY.current + threshold;
          const scrollingUp = currentScrollY < lastScrollY.current - threshold;

          if (scrollingDown && !isScrollingDown.current && isVisible.current) {
            isScrollingDown.current = true;
            isVisible.current = false;
            Animated.spring(scrollDirection, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          } else if (scrollingUp && isScrollingDown.current && !isVisible.current) {
            isScrollingDown.current = false;
            isVisible.current = true;
            Animated.spring(scrollDirection, {
              toValue: 1,
              useNativeDriver: false,
            }).start();
          }
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  const navBarTranslateY = scrollDirection.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, -20],
  });

  const bottomBarTranslateY = scrollDirection.interpolate({
    inputRange: [0, 1],
    outputRange: [150, 20],
  });

  const barOpacity = scrollDirection;
  
  const fabTranslateX = scrollDirection.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#fff"
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.appContainer}>
          <LibraryView 
            onScroll={handleScroll} 
            refreshTrigger={refreshTrigger}
            loadingBookCount={loadingBookCount}
            onBookPress={handleBookPress}
            selectedBookId={selectedBookId}
            books={books}
            onBooksReorder={handleBooksReorder}
            scrollProgress={isDetailSheetVisible ? scrollProgress : undefined}
          />
          {/* Static white background for status bar area */}
          <SafeAreaView style={styles.statusBarArea} edges={['top']} pointerEvents="none" />
          {/* Navigation bar that slides out */}
          <SafeAreaView style={styles.topSafeArea} edges={['top']} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.navBarContainer,
                {
                  transform: [{ translateY: navBarTranslateY }],
                  opacity: barOpacity,
                },
              ]}
            >
              <NavigationBar />
            </Animated.View>
          </SafeAreaView>
          {/* Bottom tab bar that slides out */}
          <Animated.View
            style={[
              styles.bottomTabBarContainer,
              {
                transform: [{ translateY: bottomBarTranslateY }],
                opacity: barOpacity,
              },
            ]}
          >
            <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} pointerEvents="box-none">
              <BottomTabBar />
            </SafeAreaView>
          </Animated.View>
          {/* Floating Action Button */}
          <Animated.View
            style={[
              {
                transform: [
                  { translateX: fabTranslateX },
                ],
                opacity: barOpacity,
              },
            ]}
          >
            <FloatingActionButton onPress={() => {
              setIsSearchSheetVisible(true);
            }} />
          </Animated.View>
          {/* Book Search Sheet */}
          <BookSearchSheet
            visible={isSearchSheetVisible}
            onClose={() => {
              setIsSearchSheetVisible(false);
              setLoadingBookCount(0);
            }}
            onBookAdded={handleBookAdded}
            onBookAdding={handleBookAdding}
          />
          {/* Book Detail Sheet */}
          <BookDetailSheet
            visible={isDetailSheetVisible}
            books={books}
            currentBookIndex={selectedBookId ? books.findIndex(b => b.id === selectedBookId) : -1}
            onClose={handleDetailSheetClose}
            onBookChange={handleBookChange}
            onBookDeleted={handleBookDeleted}
            onBookUpdated={handleBookUpdated}
            onScrollProgress={handleScrollProgress}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


export default App;
