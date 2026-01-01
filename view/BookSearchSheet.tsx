import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  Modal,
  Keyboard,
  Platform,
  ToastAndroid,
  Alert,
  Dimensions,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import RNFS from 'react-native-fs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GOOGLE_CLOUD_KEY, BASE_URL, SPINE_API_BASE_URL } from '@env';

import {
  searchBooks,
  getBookDetails,
  Book as ApiBook,
  convertToBook,
  fetchSpine,
} from '../services/booksApi';
import { saveBook, updateBook, getBookById } from '../services/bookStorage';
import { saveSpineImage } from '../services/imageStorage';
import { checkAndPromptRating } from '../services/ratingService';

import { BarcodeScanner } from './BarcodeScanner';
import { SearchBar } from './SearchBar';
import { SearchResultItem } from './SearchResultItem';
import { styles } from './styles/BookSearchSheetStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BookSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onBookAdded?: (bookId: string) => void;
  onBookAdding?: () => void;
}

export function BookSearchSheet({
  visible,
  onClose,
  onBookAdded,
  onBookAdding,
}: BookSearchSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<any>(null);
  const isHandlingBookPress = useRef(false);
  const scannedISBNs = useRef<Set<string>>(new Set());
  const scanSuccessful = useRef(false);

  const fetchAndProcessSpine = async (googleId: string, internalBookId: string) => {
    try {
      const spineUrls = await fetchSpine(googleId);
      if (spineUrls.length === 1) {
        const spineUrl = spineUrls[0];
        const tempPath = `${RNFS.TemporaryDirectoryPath}/spine_${googleId}_${Date.now()}.jpg`;
        const downloadResult = await RNFS.downloadFile({
          fromUrl: spineUrl,
          toFile: tempPath,
        }).promise;

        if (downloadResult.statusCode === 200) {
          const savedPath = await saveSpineImage(tempPath, internalBookId);
          await RNFS.unlink(tempPath);
          return savedPath;
        }
      }
    } catch (error) {
      console.error('Error fetching/processing spine:', error);
    }
    return undefined;
  };

  const handleBarcodeScanned = async (isbn: string) => {

    if (isScanning || scannedISBNs.current.has(isbn)) return;

    scannedISBNs.current.add(isbn);
    setIsScanning(true);

    ReactNativeHapticFeedback.trigger('impactHeavy', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    scanSuccessful.current = true;
    setScannerVisible(false);
    setSearchQuery(isbn);
    setLoading(true);
    if (onBookAdding) onBookAdding();

    try {
      const results = await searchBooks(isbn);
      if (results.length > 0) {
        const book = results[0];
        setLoadingDetails(true);
        const details = await getBookDetails(book.id);
        setLoadingDetails(false);

        if (details) {
          const bookToSave = convertToBook(book, details);
          const savedBookId = await saveBook(bookToSave);

          // Try to fetch spine after saving the book
          const spinePath = await fetchAndProcessSpine(book.id, savedBookId);
          if (spinePath) {
            const savedBook = await getBookById(savedBookId);
            if (savedBook) {
              await updateBook({
                ...savedBook,
                spineThumbnail: spinePath,
                spineUploaded: true, // It came from server, so it's already "uploaded" in a sense, or at least synced
              });
              checkAndPromptRating();
            }
          }

          ReactNativeHapticFeedback.trigger('notificationSuccess', {

            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });

          if (onBookAdded) onBookAdded(savedBookId);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Book added successfully!', ToastAndroid.SHORT);
          }
          setScannerVisible(false);
          Keyboard.dismiss();
          onClose();
        } else {
          throw new Error('Book details not found');
        }
      } else {
        setBooks([]);
        ReactNativeHapticFeedback.trigger('notificationWarning', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
    } catch (error: any) {
      console.error('Error scanning barcode:', error);
      if (error.message !== 'Book not found') {
        scanSuccessful.current = false;
        ReactNativeHapticFeedback.trigger('notificationError', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });

        const message =
          error.message === 'Could not connect'
            ? 'Could not connect'
            : 'Error processing scan. Please try again.';

        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert('Error', message);
        }
      }
    } finally {
      setIsScanning(false);
      scannedISBNs.current.clear();
      setLoading(false);
    }
  };

  const handleCameraPress = () => {
    scanSuccessful.current = false;
    setScannerVisible(true);
    scannedISBNs.current.clear();
    Keyboard.dismiss();
  };

  const handleScannerClose = () => {
    setScannerVisible(false);
  };

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const focusInput = () => {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      };

      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(focusInput);
      } else {
        focusInput();
      }
    } else {
      Keyboard.dismiss();
      setSearchQuery('');
      setBooks([]);
      keyboardAnim.setValue(0);
      isHandlingBookPress.current = false;
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, onClose, keyboardAnim]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        const height = e.endCoordinates.height;
        const duration = Platform.OS === 'ios' ? e.duration : 250;

        if (Platform.OS === 'ios') {
          Animated.timing(keyboardAnim, {
            toValue: -height,
            duration: duration,
            useNativeDriver: true,
          }).start();

          if (visible) {
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: duration,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      e => {
        const duration = Platform.OS === 'ios' ? e.duration : 250;

        if (Platform.OS === 'ios') {
          Animated.timing(keyboardAnim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }).start();

          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: duration,
            useNativeDriver: true,
          }).start(() => {
            if (!visible) {
              slideAnim.setValue(SCREEN_HEIGHT);
            }
          });
        } else {
          setTimeout(() => {
            if (visible && !isHandlingBookPress.current) {
              onClose();
            }
          }, 150);
        }
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible, keyboardAnim, slideAnim, onClose]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBooks([]);
      return;
    }

    try {
      setLoading(true);
      const results = await searchBooks(query);
      setBooks(results);
    } catch (error: any) {
      console.error('Error performing search:', error);
      if (error.message === 'Could not connect') {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Could not connect', ToastAndroid.SHORT);
        } else {
          Alert.alert('Error', 'Could not connect');
        }
      }
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, performSearch]);

  const handleSearch = async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    await performSearch(searchQuery);
  };

  const handleBookPress = async (book: ApiBook) => {
    isHandlingBookPress.current = true;
    if (onBookAdding) onBookAdding();

    try {
      setLoadingDetails(true);
      const details = await getBookDetails(book.id);
      setLoadingDetails(false);

      if (details) {
        const bookToSave = convertToBook(book, details);
        const savedBookId = await saveBook(bookToSave);

        // Try to fetch spine after saving the book
        const spinePath = await fetchAndProcessSpine(book.id, savedBookId);
        if (spinePath) {
          const savedBook = await getBookById(savedBookId);
          if (savedBook) {
            await updateBook({
              ...savedBook,
              spineThumbnail: spinePath,
              spineUploaded: true,
            });
            checkAndPromptRating();
          }
        }

        if (onBookAdded) onBookAdded(savedBookId);

        isHandlingBookPress.current = false;
        Keyboard.dismiss();
        onClose();
      } else {
        isHandlingBookPress.current = false;
        Keyboard.dismiss();
        onClose();
        setTimeout(() => {
          Alert.alert('Error', 'Failed to load book details');
        }, 300);
      }
    } catch (error: any) {
      setLoadingDetails(false);
      isHandlingBookPress.current = false;
      Keyboard.dismiss();
      onClose();

      const message =
        error.message === 'Could not connect'
          ? 'Could not connect'
          : 'Failed to load book details';

      setTimeout(() => {
        Alert.alert('Error', message);
      }, 300);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !scannerVisible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent={Platform.OS === 'android'}>
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          />
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  { translateY: Animated.add(slideAnim, keyboardAnim) },
                ],
                height: SCREEN_HEIGHT * 0.26,
              },
            ]}>
            <View style={styles.sheetContent}>
              <SearchBar
                searchInputRef={searchInputRef}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSubmit={handleSearch}
                onCameraPress={handleCameraPress}
                loading={loading || loadingDetails}
              />
              <FlatList
                data={books}
                renderItem={({ item }) => (
                  <SearchResultItem item={item} onPress={handleBookPress} />
                )}
                keyExtractor={item => item.id}
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

      <BarcodeScanner
        visible={scannerVisible}
        onClose={handleScannerClose}
        onBarcodeScanned={handleBarcodeScanned}
        isScanning={isScanning}
      />
    </>
  );
}
