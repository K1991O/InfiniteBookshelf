import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (isbn: string) => void;
  isScanning: boolean;
}

export function BarcodeScanner({ visible, onClose, onBarcodeScanned, isScanning }: BarcodeScannerProps) {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode={true}
          onReadCode={(event) => {
            if (event.nativeEvent.codeStringValue && !isScanning) {
              onBarcodeScanned(event.nativeEvent.codeStringValue);
            }
          }}
          showFrame={false}
        />
        {/* Dark overlay with transparent rectangle */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={onClose}
            >
              <Text style={styles.scannerCloseButtonText}>✕</Text>
            </TouchableOpacity>
            {/* <Text style={styles.scannerTitle}>Scan Barcode</Text> */}
          </View>
          
          <View style={styles.scannerCenterArea}>
            {/* ISBN Image above the frame */}
            <Image
              source={require('../assets/ISBN.png')}
              style={styles.isbnImage}
              resizeMode="contain"
            />
            
            {/* Scanning frame */}
            <View style={styles.scannerFrame}>
              <View style={styles.scannerFrameCorner} />
              <View style={[styles.scannerFrameCorner, styles.scannerFrameCornerTopRight]} />
              <View style={[styles.scannerFrameCorner, styles.scannerFrameCornerBottomLeft]} />
              <View style={[styles.scannerFrameCorner, styles.scannerFrameCornerBottomRight]} />
            </View>
            
            {/* Instruction text below the frame */}
            <Text style={styles.scannerHint}>
              scan your books ISBN number
            </Text>
          </View>
        </View>
        
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerCenterArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scannerHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  scannerCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerCloseButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  isbnImage: {
    width: 120,
    height: 60,
    marginBottom: 30,
  },
  scannerFrame: {
    width: 280,
    height: 200,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  scannerFrameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#564136',
    borderWidth: 4,
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  scannerFrameCornerTopRight: {
    top: -2,
    right: -2,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
    borderTopLeftRadius: 0,
  },
  scannerFrameCornerBottomLeft: {
    bottom: -2,
    top: 'auto',
    left: -2,
    borderTopWidth: 0,
    borderBottomWidth: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 12,
  },
  scannerFrameCornerBottomRight: {
    bottom: -2,
    top: 'auto',
    right: -2,
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 12,
  },
  scannerHint: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 30,
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  maskMiddle: {
    height: 200,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  maskTransparent: {
    width: 280,
    backgroundColor: 'transparent',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});


