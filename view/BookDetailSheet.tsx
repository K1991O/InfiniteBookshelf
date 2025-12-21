import React, { useRef, useEffect, useState } from 'react';
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
import CustomCrop from 'react-native-perspective-image-cropper';
import RNFS from 'react-native-fs';
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
  onScrollProgress?: (scrollOffset: number) => void;
}

export function BookDetailSheet({
  visible,
  books,
  currentBookIndex,
  onClose,
  onBookChange,
  onBookDeleted,
  onBookUpdated,
  onScrollProgress,
}: BookDetailSheetProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScrollDone = useRef(false);
  const isUserScrolling = useRef(false);
  const lastNotifiedIndex = useRef(currentBookIndex);
  const cropperRef = useRef<any>(null);
  const [cropperVisible, setCropperVisible] = useState(false);
  const [imageUriToCrop, setImageUriToCrop] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Reset scroll state when index becomes invalid
  useEffect(() => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) {
      isInitialScrollDone.current = false;
    }
  }, [currentBookIndex, books.length]);

  // Scroll to the current book when sheet becomes visible or when a book is clicked
  useEffect(() => {
    if (visible && scrollViewRef.current && currentBookIndex >= 0 && currentBookIndex < books.length) {
      // Initial scroll without animation when sheet first opens
      if (!isInitialScrollDone.current) {
        setTimeout(() => {
          if (scrollViewRef.current && currentBookIndex >= 0 && currentBookIndex < books.length) {
            scrollViewRef.current.scrollTo({
              x: currentBookIndex * SCREEN_WIDTH,
              animated: false,
            });
            isInitialScrollDone.current = true;
            lastNotifiedIndex.current = currentBookIndex;
          }
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
    const offsetX = event.nativeEvent.contentOffset.x;
    
    // Always pass scroll progress for smooth scaling animation
    if (onScrollProgress) {
      onScrollProgress(offsetX);
    }
    
    if (!isUserScrolling.current) return;
    
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

  const handleCropImage = async (base64Image: string, coordinates: any) => {
    console.log('✅ handleCropImage called!', {
      base64Length: base64Image?.length,
      hasCoordinates: !!coordinates,
      coordinates: coordinates,
    });
    
    if (currentBookIndex < 0 || currentBookIndex >= books.length) {
      console.error('Invalid book index');
      setCropperVisible(false);
      setImageUriToCrop(null);
      setImageDimensions(null);
      return;
    }
    const currentBook = books[currentBookIndex];
    
    try {
      // Validate the base64 string
      if (!base64Image || typeof base64Image !== 'string' || base64Image.length < 10) {
        throw new Error(`Invalid base64 image data: ${typeof base64Image}, length: ${base64Image?.length}`);
      }
      
      console.log('✅ Base64 image validated, length:', base64Image.length);
      
      // Create temporary file path
      const tempPath = `${RNFS.TemporaryDirectoryPath}/cropped_spine_${Date.now()}.jpg`;
      
      // Write base64 to temporary file
      await RNFS.writeFile(tempPath, base64Image, 'base64');
      
      console.log('✅ Temp file created:', tempPath);
      
      // Save the temporary file to spine images directory
      const savedImagePath = await saveSpineImage(tempPath, currentBook.id);
      
      console.log('✅ Image saved to:', savedImagePath);
      
      // Delete temporary file
      await RNFS.unlink(tempPath);
      
      // Delete old spine image if it exists
      if (currentBook.spineThumbnail) {
        await deleteSpineImage(currentBook.spineThumbnail);
      }
      
      // Update the book
      const updatedBook: Book = {
        ...currentBook,
        spineThumbnail: savedImagePath,
      };
      
      await updateBook(updatedBook);
      
      console.log('✅ Book updated successfully!');
      
      // Close cropper
      setCropperVisible(false);
      setImageUriToCrop(null);
      setImageDimensions(null);
      
      // Trigger refresh
      if (onBookUpdated) {
        onBookUpdated();
      }
      
      Alert.alert('Success', 'Spine image cropped and saved!');
    } catch (error) {
      console.error('❌ Error saving cropped image:', error);
      setCropperVisible(false);
      setImageUriToCrop(null);
      setImageDimensions(null);
      Alert.alert('Error', `Failed to save cropped image: ${error}`);
    }
  };

  const handleCancelCrop = () => {
    setCropperVisible(false);
    setImageUriToCrop(null);
    setImageDimensions(null);
  };

  const handleCropButtonPress = () => {
    if (cropperRef.current) {
      console.log('Calling crop() on cropperRef');
      try {
        cropperRef.current.crop();
      } catch (error) {
        console.error('Error calling crop():', error);
        Alert.alert('Error', 'Failed to crop image. Please try again.');
      }
    } else {
      console.error('cropperRef.current is null');
      Alert.alert('Error', 'Cropper not ready. Please try again.');
    }
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
      options.map((option) => ({
        text: option,
        style: option === 'Remove Spine Image' ? 'destructive' : option === 'Cancel' ? 'cancel' : 'default',
        onPress: async () => {
          if (option === 'Take Photo') {
            try {
              // Use ImagePicker.openCamera which handles EXIF orientation automatically
              const image = await ImagePicker.openCamera({
                width: 2000,
                height: 2000,
                cropping: false,
                mediaType: 'photo',
                includeBase64: false,
              });
              
              if (!image || !image.path) {
                return;
              }
              
              console.log('Image captured:', image.path, 'Width:', image.width, 'Height:', image.height);
              
              // Use the dimensions from ImagePicker (already handles EXIF orientation)
              setImageDimensions({ 
                width: image.width || SCREEN_WIDTH, 
                height: image.height || SCREEN_HEIGHT 
              });
              setImageUriToCrop(image.path);
              setCropperVisible(true);
            } catch (error: any) {
              if (error.message !== 'User cancelled image selection') {
                console.error('Error taking photo:', error);
                Alert.alert('Error', 'Failed to take photo. Please try again.');
              }
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

  // Check if currentBookIndex is valid - show blank if not
  const isValidIndex = currentBookIndex >= 0 && currentBookIndex < books.length;

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
          
          {isValidIndex ? (
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
                  
                    <>
                      <TouchableOpacity
                        style={styles.spineButton}
                        onPress={handleAddSpineImage}
                        activeOpacity={0.7}
                        disabled={index !== currentBookIndex}
                      >
                        <Text style={styles.spineButtonText}>
                          {book.spineThumbnail ? 'Retake Spine Photo' : 'Take Spine Photo'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeleteBook}
                        activeOpacity={0.7}
                        disabled={index !== currentBookIndex}
                      >
                        <Text style={styles.deleteButtonText}>Delete Book</Text>
                      </TouchableOpacity>
                    </>
                </View>
              </View>
            ))}
          </ScrollView>
          ) : (
            <View style={styles.blankContainer} />
          )}
        </View>
      </View>
      {cropperVisible && imageUriToCrop && imageDimensions && (
        <Modal
          visible={cropperVisible}
          animationType="slide"
          onRequestClose={handleCancelCrop}
        >
          <View style={styles.cropperContainer}>
            <View style={styles.cropperImageWrapper}>
              <CustomCrop
                ref={cropperRef}
                initialImage={imageUriToCrop}
                height={imageDimensions.height}
                width={imageDimensions.width}
                rectangleCoordinates={(() => {
                  // Calculate initial corner positions inside the image with padding
                  const padding = Math.min(imageDimensions.width, imageDimensions.height) * 0.1;
                  return {
                    topLeft: { x: padding, y: padding },
                    topRight: { x: imageDimensions.width - padding, y: padding },
                    bottomLeft: { x: padding, y: imageDimensions.height - padding },
                    bottomRight: { x: imageDimensions.width - padding, y: imageDimensions.height - padding },
                  };
                })()}
                updateImage={handleCropImage}
                overlayColor="rgba(255, 130, 0, 0.5)"
                overlayStrokeColor="rgba(255, 255, 255, 0.9)"
                handlerColor="rgba(255, 130, 0, 1)"
                overlayStrokeWidth={3}
              />
            </View>
          </View>
          <View style={styles.cropperButtonsContainer}>
            <TouchableOpacity
              style={styles.cropperCancelButton}
              onPress={handleCancelCrop}
              activeOpacity={0.7}
            >
              <Text style={styles.cropperButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cropperCropButton}
              onPress={handleCropButtonPress}
              activeOpacity={0.7}
            >
              <Text style={styles.cropperButtonText}>Crop</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  blankContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cropperContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cropperImageWrapper: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 80 : 50,
    marginBottom: 150,
  },
  cropperButtonsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    zIndex: 1000,
  },
  cropperCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  cropperCropButton: {
    backgroundColor: 'rgb(161, 159, 157)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  cropperButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});


