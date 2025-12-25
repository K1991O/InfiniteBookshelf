import {StyleSheet, Dimensions, Platform} from 'react-native';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.3;

export const styles = StyleSheet.create({
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
