import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { Book } from '../types/Book';
import { removeBook, updateBook } from '../services/bookStorage';
import { saveSpineImage, deleteSpineImage, resolveSpineImagePath } from '../services/imageStorage';
import { uploadSpine, fetchSpine } from '../services/booksApi';
import { userService } from '../services/userService';

import { BookDetailItem } from './BookDetailItem';
import { SpineCropper } from './SpineCropper';
import { SpineSelectorModal } from './SpineSelectorModal';
import { styles } from './styles/BookDetailSheetStyles';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [availableSpines, setAvailableSpines] = useState<string[]>([]);
  const [isFetchingSpines, setIsFetchingSpines] = useState(false);
  const checkedGoogleIds = useRef<Set<string>>(new Set());


  useEffect(() => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) {
      isInitialScrollDone.current = false;
    }
  }, [currentBookIndex, books.length]);

  useEffect(() => {
    if (
      visible &&
      scrollViewRef.current &&
      currentBookIndex >= 0 &&
      currentBookIndex < books.length
    ) {
      if (!isInitialScrollDone.current) {
        setTimeout(() => {
          if (
            scrollViewRef.current &&
            currentBookIndex >= 0 &&
            currentBookIndex < books.length
          ) {
            scrollViewRef.current.scrollTo({
              x: currentBookIndex * SCREEN_WIDTH,
              animated: false,
            });
            isInitialScrollDone.current = true;
            lastNotifiedIndex.current = currentBookIndex;
          }
        }, 50);
      } else if (!isUserScrolling.current) {
        scrollViewRef.current.scrollTo({
          x: currentBookIndex * SCREEN_WIDTH,
          animated: true,
        });
        lastNotifiedIndex.current = currentBookIndex;
      }
    }
  }, [currentBookIndex, visible, books.length]);

  useEffect(() => {
    if (!visible) {
      isInitialScrollDone.current = false;
      lastNotifiedIndex.current = currentBookIndex;
    }
  }, [visible, currentBookIndex]);

  // Auto-check for spines when index changes
  useEffect(() => {
    if (!visible || currentBookIndex < 0 || currentBookIndex >= books.length) return;

    const currentBook = books[currentBookIndex];
    if (currentBook.spineThumbnail || checkedGoogleIds.current.has(currentBook.googleId)) return;

    const checkSpines = async () => {
      checkedGoogleIds.current.add(currentBook.googleId);
      setIsFetchingSpines(true);
      try {
        const spineUrls = await fetchSpine(currentBook.googleId);
        if (spineUrls.length === 1) {
          // Auto-add if only one
          await handleSpineSelect(spineUrls[0]);
        } else if (spineUrls.length > 1) {
          // Show selection modal
          setAvailableSpines(spineUrls);
          setSelectorVisible(true);
        }
      } catch (error) {
        console.error('Error auto-checking spines:', error);
      } finally {
        setIsFetchingSpines(false);
      }
    };

    checkSpines();
  }, [currentBookIndex, visible, books]);


  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    if (onScrollProgress) onScrollProgress(offsetX);
    if (!isUserScrolling.current) return;

    const exactIndex = offsetX / SCREEN_WIDTH;
    const roundedIndex = Math.round(exactIndex);
    const distanceToRounded = Math.abs(exactIndex - roundedIndex);

    if (distanceToRounded < 0.4 && roundedIndex !== lastNotifiedIndex.current) {
      if (roundedIndex >= 0 && roundedIndex < books.length) {
        lastNotifiedIndex.current = roundedIndex;
        onBookChange(roundedIndex);
      }
    }
  };

  const handleScrollBegin = () => {
    isUserScrolling.current = true;
  };
  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (
      index >= 0 &&
      index < books.length &&
      index !== lastNotifiedIndex.current
    ) {
      lastNotifiedIndex.current = index;
      onBookChange(index);
    }
    isUserScrolling.current = false;
  };

  const handleSpineSelect = async (url: string) => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    const currentBook = books[currentBookIndex];

    setSelectorVisible(false);
    try {
      const tempPath = `${RNFS.TemporaryDirectoryPath}/spine_${currentBook.googleId}_${Date.now()}.jpg`;
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: tempPath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        const savedPath = await saveSpineImage(tempPath, currentBook.id);
        await RNFS.unlink(tempPath);

        if (currentBook.spineThumbnail) {
          await deleteSpineImage(currentBook.spineThumbnail);
        }

        await updateBook({
          ...currentBook,
          spineThumbnail: savedPath,
          spineUploaded: true, // It's from the server
        });

        if (onBookUpdated) onBookUpdated();
      }
    } catch (error) {
      console.error('Error downloading selected spine:', error);
      Alert.alert('Error', 'Failed to download selected spine');
    }
  };

  const handleTakePhoto = async () => {
    setSelectorVisible(false);
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 1,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to take photo');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        if (image.uri) {
          setImageDimensions({
            width: image.width || SCREEN_WIDTH,
            height: image.height || SCREEN_HEIGHT,
          });
          setImageUriToCrop(image.uri);
          setCropperVisible(true);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };


  const handleCropImage = async (base64Image: string, coordinates: any) => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    const currentBook = books[currentBookIndex];

    // Close cropper immediately and clear related state
    setCropperVisible(false);
    setImageUriToCrop(null);
    setImageDimensions(null);

    try {
      let newThickness = currentBook.thickness;
      if (
        coordinates?.topLeft &&
        coordinates?.topRight &&
        coordinates?.bottomLeft
      ) {
        const croppedWidth = Math.sqrt(
          Math.pow(coordinates.topRight.x - coordinates.topLeft.x, 2) +
          Math.pow(coordinates.topRight.y - coordinates.topLeft.y, 2),
        );
        const croppedHeight = Math.sqrt(
          Math.pow(coordinates.bottomLeft.x - coordinates.topLeft.x, 2) +
          Math.pow(coordinates.bottomLeft.y - coordinates.topLeft.y, 2),
        );
        newThickness = (croppedWidth / croppedHeight) * currentBook.height;
      }

      const tempPath = `${RNFS.TemporaryDirectoryPath
        }/cropped_spine_${Date.now()}.jpg`;
      await RNFS.writeFile(tempPath, base64Image, 'base64');
      const savedImagePath = await saveSpineImage(tempPath, currentBook.id);
      await RNFS.unlink(tempPath);

      if (currentBook.spineThumbnail) {
        await deleteSpineImage(currentBook.spineThumbnail);
      }

      // Update local storage first
      await updateBook({
        ...currentBook,
        spineThumbnail: savedImagePath,
        thickness: newThickness,
        spineUploaded: false,
      });

      if (onBookUpdated) onBookUpdated();

      // Background upload
      (async () => {
        try {
          const userId = await userService.getPersistentUserId();
          const resolvedPath = resolveSpineImagePath(savedImagePath);
          if (resolvedPath) {
            const uploadSuccess = await uploadSpine(
              currentBook.googleId,
              userId,
              resolvedPath,
            );
            if (uploadSuccess) {
              await updateBook({
                ...currentBook,
                spineThumbnail: savedImagePath,
                thickness: newThickness,
                spineUploaded: true,
              });
              if (onBookUpdated) onBookUpdated();
            }
          }
        } catch (uploadError: any) {
          console.error('Background upload failed:', uploadError);
          if (uploadError.message === 'Could not connect') {
            // Optional: Show a subtle notification or toast that upload failed
            // For now, just logging is fine as it's a background process
          }
        }
      })();
    } catch (error) {
      console.error('Error processing cropped image:', error);
      Alert.alert('Error', 'Failed to save cropped image');
    }
  };

  const handleDeleteBook = () => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    const currentBook = books[currentBookIndex];

    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${currentBook.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              onClose();
              await removeBook(currentBook.id);
              if (onBookDeleted) onBookDeleted();
            } catch {
              Alert.alert('Error', 'Failed to delete book');
            }
          },
        },
      ],
    );
  };

  const handleAddSpineImage = async () => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    const currentBook = books[currentBookIndex];

    setIsFetchingSpines(true);
    try {
      const spineUrls = await fetchSpine(currentBook.googleId);
      if (spineUrls.length > 0) {
        setAvailableSpines(spineUrls);
        setSelectorVisible(true);
      } else {
        // No spines on server, show direct options
        const alertButtons: any[] = [
          {
            text: 'Take Photo',
            onPress: handleTakePhoto,
          },
        ];

        if (currentBook.spineThumbnail) {
          alertButtons.push({
            text: 'Remove Spine Image',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteSpineImage(currentBook.spineThumbnail!);
                await updateBook({ ...currentBook, spineThumbnail: undefined });
                if (onBookUpdated) onBookUpdated();
              } catch {
                Alert.alert('Error', 'Failed to remove spine image');
              }
            },
          });
        }
        alertButtons.push({ text: 'Cancel', style: 'cancel', onPress: () => { } });
        Alert.alert('Spine Image', 'No existing spines found. Take a new photo?', alertButtons);
      }
    } catch (error: any) {
      console.error('Error fetching spines for selection:', error);
      if (error.message === 'Could not connect') {
        Alert.alert('Error', 'Could not connect');
      } else {
        handleTakePhoto(); // Fallback to camera
      }
    } finally {
      setIsFetchingSpines(false);
    }
  };


  if (!visible || books.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}>
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
            contentContainerStyle={styles.scrollContent}>
            {books.map((book, index) => (
              <BookDetailItem
                key={book.id}
                book={book}
                index={index}
                currentIndex={currentBookIndex}
                onAddSpineImage={handleAddSpineImage}
                onDeleteBook={handleDeleteBook}
              />
            ))}
          </ScrollView>
        </View>
      </View>
      {cropperVisible && imageUriToCrop && imageDimensions && (
        <SpineCropper
          visible={cropperVisible}
          imageUri={imageUriToCrop}
          imageDimensions={imageDimensions}
          onCrop={handleCropImage}
          onCancel={() => setCropperVisible(false)}
          cropperRef={cropperRef}
        />
      )}
      <SpineSelectorModal
        visible={selectorVisible}
        spines={availableSpines}
        onSelect={handleSpineSelect}
        onTakePhoto={handleTakePhoto}
        onClose={() => setSelectorVisible(false)}
      />
    </Modal>
  );
}

