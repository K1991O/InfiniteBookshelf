import React, {useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  BackHandler,
  Platform,
  Dimensions,
} from 'react-native';
import CustomCrop from 'react-native-perspective-image-cropper';
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
  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backAction = () => {
        onCancel();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      );
      return () => backHandler.remove();
    }
  }, [visible, onCancel]);

  const handleCropButtonPress = () => {
    if (cropperRef.current) {
      cropperRef.current.crop();
    }
  };

  // Ensure we have valid dimensions
  const imgWidth = imageDimensions.width || SCREEN_WIDTH;
  const imgHeight = imageDimensions.height || SCREEN_WIDTH;

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
                x: imgWidth * 0.1,
                y: imgHeight * 0.1,
              },
              topRight: {
                x: imgWidth * 0.9,
                y: imgHeight * 0.1,
              },
              bottomLeft: {
                x: imgWidth * 0.1,
                y: imgHeight * 0.9,
              },
              bottomRight: {
                x: imgWidth * 0.9,
                y: imgHeight * 0.9,
              },
            }}
            updateImage={onCrop}
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
    </Modal>
  );
};
