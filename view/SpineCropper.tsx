import React from 'react';
import {View, Text, TouchableOpacity, Modal} from 'react-native';
import CustomCrop from 'react-native-perspective-image-cropper';
import {styles} from './styles/BookDetailSheetStyles';

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
  const handleCropButtonPress = () => {
    if (cropperRef.current) {
      cropperRef.current.crop();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.cropperContainer}>
        <View style={styles.cropperImageWrapper}>
          <CustomCrop
            ref={cropperRef}
            initialImage={imageUri}
            height={imageDimensions.height}
            width={imageDimensions.width}
            rectangleCoordinates={{
              topLeft: {
                x: imageDimensions.width * 0.1,
                y: imageDimensions.height * 0.1,
              },
              topRight: {
                x: imageDimensions.width * 0.9,
                y: imageDimensions.height * 0.1,
              },
              bottomLeft: {
                x: imageDimensions.width * 0.1,
                y: imageDimensions.height * 0.9,
              },
              bottomRight: {
                x: imageDimensions.width * 0.9,
                y: imageDimensions.height * 0.9,
              },
            }}
            updateImage={onCrop}
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
