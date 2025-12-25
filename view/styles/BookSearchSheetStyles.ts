import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  sheetContent: {
    flex: 1,
  },
  searchContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  searchInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  searchInput: {
    width: '87%',
    height: 44,
    borderWidth: 2,
    borderColor: '#564136',
    borderRadius: 1000,
    paddingHorizontal: 12,
    paddingLeft: 40,
    paddingRight: 50,
    fontSize: 16,
  },
  cameraButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 24,
    height: 21.33,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 20,
    height: 21,
  },
  bookList: {
    flex: 1,
  },
  bookListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  bookItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  bookCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCoverPlaceholderText: {
    fontSize: 24,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  bookSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
});
