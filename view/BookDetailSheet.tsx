import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { Book } from '../types/Book';
import { removeBook, updateBook } from '../services/bookStorage';
import { saveSpineImage, deleteSpineImage } from '../services/imageStorage';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.3;

interface BookDetailSheetProps {
  visible: boolean;
  books: Book[];
  currentBookIndex: number;
  onClose: () => void;
  onBookChange: (index: number) => void;
  onBookDeleted?: () => void;
  onBookUpdated?: () => void;
}

export function BookDetailSheet({
  visible,
  books,
  currentBookIndex,
  onClose,
  onBookChange,
  onBookDeleted,
  onBookUpdated,
}: BookDetailSheetProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScrollDone = useRef(false);
  const isUserScrolling = useRef(false);
  const lastNotifiedIndex = useRef(currentBookIndex);

  // Scroll to the current book when sheet becomes visible or when a book is clicked
  useEffect(() => {
    if (visible && scrollViewRef.current && currentBookIndex >= 0 && currentBookIndex < books.length) {
      // Initial scroll without animation when sheet first opens
      if (!isInitialScrollDone.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: currentBookIndex * SCREEN_WIDTH,
            animated: false,
          });
          isInitialScrollDone.current = true;
          lastNotifiedIndex.current = currentBookIndex;
        }, 50);
      } else if (!isUserScrolling.current) {
        // Only programmatically scroll if user isn't scrolling
        // (when clicking a book on the shelf)
        scrollViewRef.current.scrollTo({
          x: currentBookIndex * SCREEN_WIDTH,
          animated: true,
        });
        lastNotifiedIndex.current = currentBookIndex;
      }
    }
  }, [currentBookIndex, visible, books.length]);

  // Reset initial scroll flag when sheet closes
  useEffect(() => {
    if (!visible) {
      isInitialScrollDone.current = false;
      lastNotifiedIndex.current = currentBookIndex;
    }
  }, [visible, currentBookIndex]);

  // Handle real-time scroll updates with threshold to prevent jank
  const handleScroll = (event: any) => {
    if (!isUserScrolling.current) return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    // Calculate which page we're closest to based on scroll position
    const exactIndex = offsetX / SCREEN_WIDTH;
    const roundedIndex = Math.round(exactIndex);
    
    // Only update if we've crossed the 40% threshold to the next book
    // This prevents jittery updates
    const distanceToRounded = Math.abs(exactIndex - roundedIndex);
    if (distanceToRounded < 0.4 && roundedIndex !== lastNotifiedIndex.current) {
      if (roundedIndex >= 0 && roundedIndex < books.length) {
        lastNotifiedIndex.current = roundedIndex;
        onBookChange(roundedIndex);
      }
    }
  };

  // Handle scroll begin to track user scrolling
  const handleScrollBegin = () => {
    isUserScrolling.current = true;
  };

  // Handle scroll end to finalize the position
  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    // Ensure we're on the correct book when scroll ends
    if (index >= 0 && index < books.length && index !== lastNotifiedIndex.current) {
      lastNotifiedIndex.current = index;
      onBookChange(index);
    }
    
    isUserScrolling.current = false;
  };

  const handleDeleteBook = () => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    
    const currentBook = books[currentBookIndex];
    
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${currentBook.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Close sheet first to prevent visual issues
              onClose();
              
              // Delete the book from storage
              await removeBook(currentBook.id);
              
              // Trigger refresh to recalculate book positions
              if (onBookDeleted) {
                onBookDeleted();
              }
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Error', 'Failed to delete book. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleAddSpineImage = () => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    
    const currentBook = books[currentBookIndex];
    
    // Show options to take photo or remove existing
    const options = ['Take Photo'];
    if (currentBook.spineThumbnail) {
      options.push('Remove Spine Image');
    }
    options.push('Cancel');
    
    Alert.alert(
      'Spine Image',
      'Choose an option',
      options.map((option, index) => ({
        text: option,
        style: option === 'Remove Spine Image' ? 'destructive' : option === 'Cancel' ? 'cancel' : 'default',
        onPress: async () => {
          if (option === 'Take Photo') {
            try {
              // Launch camera to take a photo
              launchCamera(
                {
                  mediaType: 'photo' as MediaType,
                  quality: 1,
                  saveToPhotos: false, // Don't save to camera roll
                  cameraType: 'back',
                },
                async (response: ImagePickerResponse) => {
                  if (response.didCancel || !response.assets || response.assets.length === 0) {
                    return;
                  }
                  
                  const imageUri = response.assets[0].uri;
                  if (!imageUri) return;
                  
                  try {
                    // Crop the image - for a spine, we want a tall, narrow crop
                    // Calculate crop dimensions based on book dimensions
                    // For a spine, height is much larger than width
                    // Using a ratio that makes sense for book spines
                    const aspectRatio = currentBook.height / currentBook.thickness;
                    // Use a reasonable base size for cropping
                    const baseSize = 1000;
                    const cropWidth = Math.round(baseSize / aspectRatio);
                    const cropHeight = baseSize;
                    
                    const croppedImage = await ImagePicker.openCropper({
                      path: imageUri,
                      width: cropWidth,
                      height: cropHeight,
                      cropping: true,
                      mediaType: 'photo',
                      cropperToolbarTitle: 'Crop Spine Image',
                      cropperChooseText: 'Save',
                      cropperCancelText: 'Cancel',
                      compressImageQuality: 0.8,
                      freeStyleCropEnabled: true,
                    });
                    
                    // Save the cropped image to app-specific directory
                    const savedImagePath = await saveSpineImage(croppedImage.path, currentBook.id);
                    
                    // Delete old spine image if it exists
                    if (currentBook.spineThumbnail) {
                      await deleteSpineImage(currentBook.spineThumbnail);
                    }
                    
                    // Update the book with the saved image path
                    const updatedBook: Book = {
                      ...currentBook,
                      spineThumbnail: savedImagePath,
                    };
                    
                    await updateBook(updatedBook);
                    
                    // Trigger refresh
                    if (onBookUpdated) {
                      onBookUpdated();
                    }
                  } catch (error: any) {
                    if (error.message !== 'User cancelled image selection' && error.message !== 'User cancelled image cropping') {
                      console.error('Error processing image:', error);
                      Alert.alert('Error', 'Failed to process image. Please try again.');
                    }
                  }
                }
              );
            } catch (error) {
              console.error('Error launching camera:', error);
              Alert.alert('Error', 'Failed to launch camera. Please try again.');
            }
          } else if (option === 'Remove Spine Image') {
            try {
              // Delete the spine image file
              if (currentBook.spineThumbnail) {
                await deleteSpineImage(currentBook.spineThumbnail);
              }
              
              const updatedBook: Book = {
                ...currentBook,
                spineThumbnail: undefined,
              };
              
              await updateBook(updatedBook);
              
              // Trigger refresh
              if (onBookUpdated) {
                onBookUpdated();
              }
            } catch (error) {
              console.error('Error removing spine image:', error);
              Alert.alert('Error', 'Failed to remove spine image. Please try again.');
            }
          }
        },
      })),
      { cancelable: true }
    );
  };

  if (!visible || books.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <View style={styles.closeButtonInner}>
              <Text style={styles.closeButtonText}>✕</Text>
            </View>
          </TouchableOpacity>
          
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBegin}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
            contentContainerStyle={styles.scrollContent}
          >
            {books.map((book, index) => (
              <View key={book.id} style={styles.bookItem}>
                {book.smallThumbnail ? (
                  <Image
                    source={{ uri: book.smallThumbnail }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                    <Text style={styles.thumbnailPlaceholderText}>📚</Text>
                  </View>
                )}
                <View style={styles.bookInfo}>
                  <Text style={styles.title} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.author} numberOfLines={1}>
                    {book.author}
                  </Text>
                  {index === currentBookIndex && (
                    <>
                      <TouchableOpacity
                        style={styles.spineButton}
                        onPress={handleAddSpineImage}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.spineButtonText}>
                          {book.spineThumbnail ? 'Retake Spine Photo' : 'Take Spine Photo'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeleteBook}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteButtonText}>Delete Book</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: SHEET_HEIGHT,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
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
  scrollContent: {
    alignItems: 'center',
  },
  bookItem: {
    width: SCREEN_WIDTH,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 120,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    marginRight: 16,
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 32,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  author: {
    fontSize: 16,
    color: '#666',
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  spineButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#564136',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  spineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});


