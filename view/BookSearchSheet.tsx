import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Keyboard,
  Platform,
  ToastAndroid,
  Alert,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchBooks, getBookDetails, Book as ApiBook, BookDetails } from '../services/booksApi';
import { Book } from '../types/Book';
import { saveBook } from '../services/bookStorage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BookSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onBookAdded?: () => void;
  onBookAdding?: () => void;
}

export function BookSearchSheet({ visible, onClose, onBookAdded, onBookAdding }: BookSearchSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardReady, setKeyboardReady] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const isHandlingBookPress = useRef(false);

  useEffect(() => {
    if (visible) {
      // Start sheet offscreen
      slideAnim.setValue(SCREEN_HEIGHT);
      
      // Animate sheet in immediately (don't wait for keyboard on Android)
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Force keyboard to show after sheet starts animating
      // Use InteractionManager on Android to ensure Modal is fully rendered
      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        });
      } else {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    } else {
      // Dismiss keyboard and reset
      Keyboard.dismiss();
      setSearchQuery('');
      setBooks([]);
      setKeyboardHeight(0);
      setKeyboardReady(false);
      isHandlingBookPress.current = false;
      // Animate sheet out
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        const duration = Platform.OS === 'ios' ? e.duration : 250;
        
        setKeyboardHeight(height);
        setKeyboardReady(true);
        
        // On iOS, animate sheet with keyboard. On Android, sheet is already visible.
        if (visible && Platform.OS === 'ios') {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: false,
          }).start();
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        const duration = Platform.OS === 'ios' ? e.duration : 250;
        
        setKeyboardHeight(0);
        setKeyboardReady(false);
        
        if (Platform.OS === 'ios') {
          // On iOS, animate sheet out with keyboard
          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: duration,
            useNativeDriver: false,
          }).start(() => {
            if (!visible) {
              slideAnim.setValue(SCREEN_HEIGHT);
            }
          });
        } else {
          // On Android, if keyboard dismisses, close the sheet
          // Add a delay to allow book press handler to set the flag first
          // But don't close if we're handling a book press (will close after showing toast)
          setTimeout(() => {
            if (visible && !isHandlingBookPress.current) {
              onClose();
            }
          }, 150);
        }
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBooks([]);
      return;
    }

    setLoading(true);
    const results = await searchBooks(query);
    setBooks(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 400); // 0.4 seconds debounce

    // Cleanup on unmount or when searchQuery changes
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, performSearch]);

  const handleSearch = async () => {
    // Clear debounce timer and search immediately
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    await performSearch(searchQuery);
  };

  // Helper function to convert API BookDetails to our Book type
  const convertToBook = (apiBook: ApiBook, details: BookDetails): Book => {
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

  const handleBookPress = async (book: ApiBook) => {
    // Set flag to prevent keyboard dismiss from auto-closing sheet
    isHandlingBookPress.current = true;
    setAddingBookId(book.id);
    
    // Notify parent that we're adding a book (to show skeleton)
    if (onBookAdding) {
      onBookAdding();
    }
    
    try {
      setLoadingDetails(true);
      const details = await getBookDetails(book.id);
      setLoadingDetails(false);

      if (details) {
        // Convert to our Book type and save to storage
        const bookToSave = convertToBook(book, details);
        
        // Simulate loading time for skeleton animation (at least 1 second)
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 1000);
        });
        
        await saveBook(bookToSave);
        
        // Notify parent that a book was added
        if (onBookAdded) {
          onBookAdded();
        }
        
        // Close the sheet
        isHandlingBookPress.current = false;
        setAddingBookId(null);
        Keyboard.dismiss();
        onClose();
      } else {
        // If details is null, show error
        setAddingBookId(null);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Failed to load book details', ToastAndroid.SHORT);
          setTimeout(() => {
            isHandlingBookPress.current = false;
            Keyboard.dismiss();
            onClose();
          }, 100);
        } else {
          isHandlingBookPress.current = false;
          Keyboard.dismiss();
          onClose();
          setTimeout(() => {
            Alert.alert('Error', 'Failed to load book details');
          }, 300);
        }
      }
    } catch (error) {
      setLoadingDetails(false);
      setAddingBookId(null);
      console.error('Error handling book press:', error);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Error loading book details', ToastAndroid.SHORT);
        setTimeout(() => {
          isHandlingBookPress.current = false;
          Keyboard.dismiss();
          onClose();
        }, 100);
      } else {
        isHandlingBookPress.current = false;
        Keyboard.dismiss();
        onClose();
        setTimeout(() => {
          Alert.alert('Error', 'Failed to load book details');
        }, 300);
      }
    }
  };

  const renderBookItem = ({ item }: { item: ApiBook }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => handleBookPress(item)}
      activeOpacity={0.7}
    >
      {item.smallThumbnail || item.thumbnail ? (
        <Image
          source={{
            uri: item.smallThumbnail || item.thumbnail || '',
          }}
          style={styles.bookCover}
        />
      ) : (
        <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
          <Text style={styles.bookCoverPlaceholderText}>📚</Text>
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookSubtitle} numberOfLines={1}>
          {item.subtitle || item.authors?.join(', ') || 'Unknown Author'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            // Dismiss keyboard and sheet together
            Keyboard.dismiss();
            onClose();
          }}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              height: SCREEN_HEIGHT * 0.26, // 28% of screen height
              bottom: Platform.OS === 'ios'
                ? keyboardHeight
                : 0, // On Android, system handles keyboard with adjustResize
            },
          ]}
        >
          <View style={styles.sheetContent}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {
                // Focus search when tapping on search container
                searchInputRef.current?.focus();
              }}
            >
              <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                  {loading || loadingDetails ? (
                    <ActivityIndicator
                      size="small"
                      color="#564136"
                      style={styles.searchIcon}
                    />
                  ) : (
                    <Image
                      source={require('../assets/search.png')}
                      style={styles.searchIcon}
                    />
                  )}
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search for books..."
                    placeholderTextColor="#828282"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoFocus={false}
                    showSoftInputOnFocus={true}
                  />

                </View>
              </View>
            </TouchableOpacity>

            <FlatList
              data={books}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              style={styles.bookList}
              contentContainerStyle={styles.bookListContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                !loading && searchQuery ? (
                  <Text style={styles.emptyText}>No books found</Text>
                ) : null
              }
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  sheetTouchable: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  searchContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  searchInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  searchInput: {
    width: '100%',
    height: 44,
    borderWidth: 2,
    borderColor: '#564136',
    borderRadius: 1000,
    paddingHorizontal: 12,
    paddingLeft: 40,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 20,
    height: 21,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  bookList: {
    flex: 1,
  },
  bookListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  bookItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  bookCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCoverPlaceholderText: {
    fontSize: 24,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  bookSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
});
