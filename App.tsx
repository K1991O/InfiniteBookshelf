/**
 * Infinite Bookshelf App
 *
 * @format
 */

import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar, View, Platform, Animated, Dimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { styles } from './view/styles/Main';
import { LibraryView } from './view/LibraryView';
import { NavigationBar } from './view/NavigationBar';
import { BottomTabBar } from './view/BottomTabBar';
import { FloatingActionButton } from './view/FloatingActionButton';
import { BookSearchSheet } from './view/BookSearchSheet';
import { BookDetailSheet } from './view/BookDetailSheet';
import { TierListSheet } from './view/TierListSheet';
import { Book } from './types/Book';
import {
  loadBooks,
  saveBooks,
  updateBooksWithSpineImageDimensions,
} from './services/bookStorage';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { userService } from './services/userService';


function App() {
  const [isSearchSheetVisible, setIsSearchSheetVisible] = useState(false);
  const [isTierListVisible, setIsTierListVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingBookCount, setLoadingBookCount] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const {
    handleScroll,
    navBarTranslateY,
    bottomBarTranslateY,
    barOpacity,
    fabTranslateX,
  } = useScrollAnimation();

  // Load books from storage
  const loadBooksFromStorage = useCallback(async (isInitial: boolean = false) => {
    try {
      // Only update book thicknesses on initial load or if explicitly requested
      if (isInitial) {
        await updateBooksWithSpineImageDimensions();
      }

      // Then load the books
      const savedBooks = await loadBooks();
      setBooks(savedBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }, []);

  // Load books on mount
  useEffect(() => {
    loadBooksFromStorage(true);

    // Log the persistent User ID for verification
    const fetchUserId = async () => {
      const userId = await userService.getPersistentUserId();
      console.log('Persistent Persistent User ID:', userId);
    };
    fetchUserId();
  }, [loadBooksFromStorage]);

  // Handle refresh separately to avoid re-checking all spine dimensions
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadBooksFromStorage(false);
    }
  }, [refreshTrigger, loadBooksFromStorage]);


  const handleBookAdded = useCallback(
    async (bookId: string) => {
      // Refresh the books list
      const savedBooks = await loadBooks();
      setBooks(savedBooks);
      setLoadingBookCount(0);

      // Find the book and open its details
      const bookIndex = savedBooks.findIndex(b => b.id === bookId);
      if (bookIndex >= 0) {
        setSelectedBookId(bookId);
        const { width: SCREEN_WIDTH } = Dimensions.get('window');
        setScrollProgress(bookIndex * SCREEN_WIDTH);
        setIsDetailSheetVisible(true);
      }
    },
    [setBooks, setLoadingBookCount],
  );

  const handleBookAdding = () => {
    setLoadingBookCount(1);
  };

  const handleBookPress = useCallback(
    (book: Book, _index: number) => {
      setSelectedBookId(book.id);
      // Initialize scroll progress to the selected book's position
      const bookIndex = books.findIndex(b => b.id === book.id);
      if (bookIndex >= 0) {
        const { width: SCREEN_WIDTH } = Dimensions.get('window');
        setScrollProgress(bookIndex * SCREEN_WIDTH);
      }
      setIsDetailSheetVisible(true);
    },
    [books],
  );

  const handleBookChange = useCallback(
    (index: number) => {
      if (index >= 0 && index < books.length) {
        setSelectedBookId(books[index]?.id || null);
      }
    },
    [books],
  );

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
          <SafeAreaView
            style={styles.statusBarArea}
            edges={['top']}
            pointerEvents="none"
          />
          {/* Navigation bar that slides out */}
          <SafeAreaView
            style={styles.topSafeArea}
            edges={['top']}
            pointerEvents="box-none">
            <Animated.View
              style={[
                styles.navBarContainer,
                {
                  transform: [{ translateY: navBarTranslateY }],
                  opacity: barOpacity,
                },
              ]}>
              <NavigationBar onTierListPress={() => setIsTierListVisible(true)} />
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
            ]}>
            <SafeAreaView
              style={styles.bottomSafeArea}
              edges={['bottom']}
              pointerEvents="box-none">
              <BottomTabBar />
            </SafeAreaView>
          </Animated.View>
          {/* Floating Action Button */}
          <Animated.View
            style={[
              {
                transform: [{ translateX: fabTranslateX }],
                opacity: barOpacity,
              },
            ]}>
            <FloatingActionButton
              onPress={() => {
                setIsSearchSheetVisible(true);
              }}
            />
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
            currentBookIndex={
              selectedBookId
                ? books.findIndex(b => b.id === selectedBookId)
                : -1
            }
            onClose={handleDetailSheetClose}
            onBookChange={handleBookChange}
            onBookDeleted={handleBookDeleted}
            onBookUpdated={handleBookUpdated}
            onScrollProgress={handleScrollProgress}
          />
          {/* Tier List Sheet */}
          <TierListSheet
            visible={isTierListVisible}
            onClose={() => setIsTierListVisible(false)}
            books={books}
            onUpdate={handleBookUpdated}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
