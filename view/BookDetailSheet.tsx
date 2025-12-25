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
import ImagePicker from 'react-native-image-crop-picker';
import RNFS from 'react-native-fs';
import { Book } from '../types/Book';
import { removeBook, updateBook } from '../services/bookStorage';
import { saveSpineImage, deleteSpineImage } from '../services/imageStorage';
import { BookDetailItem } from './BookDetailItem';
import { SpineCropper } from './SpineCropper';
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

  const handleCropImage = async (base64Image: string, coordinates: any) => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    const currentBook = books[currentBookIndex];

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

      if (currentBook.spineThumbnail)
        await deleteSpineImage(currentBook.spineThumbnail);

      await updateBook({
        ...currentBook,
        spineThumbnail: savedImagePath,
        thickness: newThickness,
      });

      setCropperVisible(false);
      setImageUriToCrop(null);
      setImageDimensions(null);
      if (onBookUpdated) onBookUpdated();
      Alert.alert('Success', 'Spine image cropped and saved!');
    } catch (error) {
      console.error('Error saving cropped image:', error);
      setCropperVisible(false);
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

  const handleAddSpineImage = () => {
    if (currentBookIndex < 0 || currentBookIndex >= books.length) return;
    const currentBook = books[currentBookIndex];

    const alertButtons: any[] = [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const image = await ImagePicker.openCamera({
              width: 2000,
              height: 2000,
              cropping: false,
              mediaType: 'photo',
            });
            if (image?.path) {
              setImageDimensions({
                width: image.width || SCREEN_WIDTH,
                height: image.height || SCREEN_HEIGHT,
              });
              setImageUriToCrop(image.path);
              setCropperVisible(true);
            }
          } catch (error: any) {
            if (error.message !== 'User cancelled image selection')
              Alert.alert('Error', 'Failed to take photo');
          }
        },
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

    Alert.alert('Spine Image', 'Choose an option', alertButtons);
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
    </Modal>
  );
}
