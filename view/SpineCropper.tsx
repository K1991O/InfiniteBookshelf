import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  BackHandler,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import CustomCrop from './CustomCrop';
import {styles} from './styles/BookDetailSheetStyles';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface SpineCropperProps {
  visible: boolean;
  imageUri: string;
  imageDimensions: {width: number; height: number};
  onCrop: (base64Image: string, coordinates: any) => void;
  onCancel: () => void;
  cropperRef: React.RefObject<any>;
}

export const SpineCropper = ({
  visible,
  imageUri,
  imageDimensions,
  onCrop,
  onCancel,
  cropperRef,
}: SpineCropperProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastCoordinates, setLastCoordinates] = useState<any>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backAction = () => {
        if (previewImage) {
          setPreviewImage(null);
          return true;
        }
        onCancel();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      );
      return () => backHandler.remove();
    }
  }, [visible, onCancel, previewImage]);

  const handleCropButtonPress = () => {
    if (cropperRef.current) {
      cropperRef.current.crop();
    }
  };

  const handleCroppedImage = (base64Image: string, coordinates: any) => {
    setPreviewImage(base64Image);
    setLastCoordinates(coordinates);
  };

  const handleAccept = () => {
    if (previewImage && lastCoordinates) {
      onCrop(previewImage, lastCoordinates);
      setPreviewImage(null);
    }
  };

  const handleDecline = () => {
    setPreviewImage(null);
  };

  // Ensure we have valid dimensions
  const imgWidth = imageDimensions.width || SCREEN_WIDTH;
  const imgHeight = imageDimensions.height || SCREEN_WIDTH;

  // Calculate 50px margin in image coordinates to avoid Android edge gestures
  const viewWidth = SCREEN_WIDTH;
  const pixelMargin = (50 * imgWidth) / viewWidth;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      hardwareAccelerated>
      <View style={styles.cropperContainer}>
        <View style={styles.cropperImageWrapper}>
          <CustomCrop
            ref={cropperRef}
            initialImage={imageUri}
            height={imgHeight}
            width={imgWidth}
            rectangleCoordinates={{
              topLeft: {
                x: (imgWidth * 0.1) + pixelMargin,
                y: imgHeight * 0.1,
              },
              topRight: {
                x: (imgWidth * 0.9) - pixelMargin,
                y: imgHeight * 0.1,
              },
              bottomLeft: {
                x: (imgWidth * 0.1) + pixelMargin,
                y: imgHeight * 0.9,
              },
              bottomRight: {
                x: (imgWidth * 0.9) - pixelMargin,
                y: imgHeight * 0.9,
              },
            }}
            updateImage={handleCroppedImage}
            overlayColor="rgba(255, 130, 0, 0.3)"
            overlayStrokeColor="rgba(255, 130, 0, 1)"
            handlerColor="rgba(255, 130, 0, 1)"
            handlerOuterColor="rgba(255, 130, 0, 0.1)"
            borderColor="white"
            overlayStrokeWidth={2}
          />
        </View>
      </View>
      <View style={styles.cropperButtonsContainer}>
        <TouchableOpacity
          style={styles.cropperCancelButton}
          onPress={onCancel}
          activeOpacity={0.7}>
          <Text style={styles.cropperButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cropperCropButton}
          onPress={handleCropButtonPress}
          activeOpacity={0.7}>
          <Text style={styles.cropperButtonText}>Crop</Text>
        </TouchableOpacity>
      </View>

      {previewImage && (
        <SafeAreaView style={styles.previewContainer} edges={['top', 'bottom']}>
          <Image
            source={{uri: `data:image/jpeg;base64,${previewImage}`}}
            style={[
              styles.previewImage,
              {height: Dimensions.get('window').height * 0.7, marginBottom: 100},
            ]}
            resizeMode="contain"
          />
          <View style={styles.previewButtonsContainer}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.7}>
              <Text style={styles.cropperButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.7}>
              <Text style={styles.cropperButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
};
