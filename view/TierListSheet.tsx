import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { Book } from '../types/Book';
import { updateBook, TierConfig, loadTierConfig, saveTierConfig, DEFAULT_TIERS } from '../services/bookStorage';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { CameraRoll, iosRequestAddOnlyGalleryPermission } from "@react-native-camera-roll/camera-roll";
import { BookshelfOverlay } from './BookshelfOverlay';
import { Platform, PermissionsAndroid } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_WIDTH = SCREEN_WIDTH * 0.9;
const TIER_LIST_EXPORT_WIDTH = 1000;
const EXPORT_BOOK_WIDTH = 80;
const EXPORT_BOOK_HEIGHT = 120;
const EXPORT_GAP = 8;
const EXPORT_PADDING = 10;
const EXPORT_LABEL_WIDTH = 160;

const PRESET_COLORS = [
  '#FF7F7F', '#FFBF7F', '#FFFF7F', '#7FFF7F', '#7F7FFF', 
  '#FF7FB6', '#BF7FFF', '#7FFFFF', '#EEE', '#333'
];

interface TierListSheetProps {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  onUpdate?: () => void;
}

export function TierListSheet({ visible, onClose, books, onUpdate }: TierListSheetProps) {
  const slideAnim = useRef(new Animated.Value(-SHEET_WIDTH)).current;
  const viewShotRef = useRef<any>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [tierConfig, setTierConfig] = useState<TierConfig[]>([]);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [localBooks, setLocalBooks] = useState<Book[]>(books);

  useEffect(() => {
    setLocalBooks(books);
  }, [books]);

  useEffect(() => {
    if (visible) {
      loadConfig();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SHEET_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setIsEditingConfig(false);
    }
  }, [visible, slideAnim]);

  const loadConfig = async () => {
    const config = await loadTierConfig();
    setTierConfig(config);
  };

  const handleRankBook = (book: Book, tierId: string | undefined) => {
    // 1. Update local state immediately for instant feedback
    const updatedBooks = localBooks.map(b => 
      b.id === book.id ? { ...b, ranking: tierId } : b
    );
    setLocalBooks(updatedBooks);
    setSelectedBook(null);

    // 2. Perform persistence in background
    setTimeout(async () => {
      try {
        await updateBook({ ...book, ranking: tierId });
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error ranking book:', error);
      }
    }, 0);
  };

  const handleAddTier = () => {
    const newTier: TierConfig = {
      id: Date.now().toString(),
      label: 'New',
      color: '#EEE',
    };
    const updatedConfig = [...tierConfig, newTier];
    setTierConfig(updatedConfig);
    saveTierConfig(updatedConfig);
  };

  const handleRemoveTier = (tierId: string) => {
    const updatedConfig = tierConfig.filter(t => t.id !== tierId);
    setTierConfig(updatedConfig);
    saveTierConfig(updatedConfig);
    
    // Remove ranking from books in this tier
    const updatedBooks = localBooks.map(b => 
      b.ranking === tierId ? { ...b, ranking: undefined } : b
    );
    setLocalBooks(updatedBooks);
    
    // Background update
    localBooks.forEach(b => {
      if (b.ranking === tierId) {
        updateBook({ ...b, ranking: undefined });
      }
    });
    if (onUpdate) onUpdate();
  };

  const handleUpdateTier = (tierId: string, updates: Partial<TierConfig>) => {
    const updatedConfig = tierConfig.map(t => 
      t.id === tierId ? { ...t, ...updates } : t
    );
    setTierConfig(updatedConfig);
    saveTierConfig(updatedConfig);
  };

  const moveTier = (fromIndex: number, toIndex: number) => {
    const newConfig = [...tierConfig];
    const [movedItem] = newConfig.splice(fromIndex, 1);
    newConfig.splice(toIndex, 0, movedItem);
    setTierConfig(newConfig);
    saveTierConfig(newConfig);
  };

  const renderTierPicker = () => {
    if (!selectedBook) return null;

    return (
      <Modal transparent visible={!!selectedBook} animationType="fade">
        <TouchableOpacity 
          style={styles.pickerBackdrop} 
          onPress={() => setSelectedBook(null)}
          activeOpacity={1}
        >
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Rank "{selectedBook.title}"</Text>
            <View style={styles.pickerTiers}>
              {tierConfig.map(tier => (
                <TouchableOpacity
                  key={tier.id}
                  style={[styles.pickerTierButton, { backgroundColor: tier.color }]}
                  onPress={() => handleRankBook(selectedBook, tier.id)}
                >
                  <Text style={styles.pickerTierText}>{tier.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.pickerTierButton, { backgroundColor: '#EEE' }]}
                onPress={() => handleRankBook(selectedBook, undefined)}
              >
                <Text style={[styles.pickerTierText, { color: '#666', fontSize: 14 }]}>Remove</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.pickerCancel} 
              onPress={() => setSelectedBook(null)}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const rankedBooks = localBooks.filter(b => b.ranking);
  const unrankedBooks = localBooks.filter(b => !b.ranking);

  const shelfImage = require('../assets/library_4thin.jpg');
  const shelfImageSource = Image.resolveAssetSource(shelfImage);
  const shelfImageHeight = (shelfImageSource.height / shelfImageSource.width) * SCREEN_WIDTH;

  // Calculate dynamic heights for tiers in export
  const availableWidthForBooks = TIER_LIST_EXPORT_WIDTH - EXPORT_LABEL_WIDTH - (EXPORT_PADDING * 2);
  const booksPerRow = Math.floor((availableWidthForBooks + EXPORT_GAP) / (EXPORT_BOOK_WIDTH + EXPORT_GAP));
  
  const tierHeights = tierConfig.map(tier => {
    const tierBooks = localBooks.filter(b => b.ranking === tier.id);
    const rows = Math.max(1, Math.ceil(tierBooks.length / booksPerRow));
    return rows * (EXPORT_BOOK_HEIGHT + EXPORT_GAP) - EXPORT_GAP + (EXPORT_PADDING * 2);
  });

  const totalTierHeight = tierHeights.reduce((sum, h) => sum + h, 0);
  const shelfScale = totalTierHeight / shelfImageHeight;
  const shelfExportWidth = SCREEN_WIDTH * shelfScale;
  const finalExportWidth = TIER_LIST_EXPORT_WIDTH + shelfExportWidth;

  const handleExportImage = async () => {
    try {
      if (!viewShotRef.current) return;
      
      // Request permission based on platform
      if (Platform.OS === 'ios') {
        const status = await iosRequestAddOnlyGalleryPermission();
        if (status !== 'granted' && status !== 'limited') {
          Alert.alert('Permission Denied', 'We need permission to save images to your gallery.');
          return;
        }
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'We need permission to save images to your gallery.');
            return;
          }
        } else {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
          );
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'We need permission to save images to your gallery.');
            return;
          }
        }
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        width: finalExportWidth,
      });
      
      await CameraRoll.save(uri, { type: 'photo' });
      
      Alert.alert('Export Success', 'Tier list has been saved to your gallery!');
      console.log('Capture saved to gallery:', uri);
    } catch (error) {
      console.error('Capture or Save failed:', error);
      Alert.alert('Export Failed', 'Could not save the tier list to your gallery.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Tier List</Text>
              <TouchableOpacity onPress={() => setIsEditingConfig(!isEditingConfig)}>
                <Text style={styles.editConfigText}>{isEditingConfig ? 'Done Editing' : 'Edit Tiers'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {tierConfig.map((tier, index) => (
              <View key={tier.id} style={styles.tierRow}>
                <View style={[styles.tierLabel, { backgroundColor: tier.color }]}>
                  {isEditingConfig ? (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      <TextInput
                        style={styles.tierLabelInput}
                        value={tier.label}
                        onChangeText={(text) => handleUpdateTier(tier.id, { label: text })}
                        autoFocus={false}
                      />
                      <View style={styles.colorPicker}>
                        {PRESET_COLORS.map(color => (
                          <TouchableOpacity 
                            key={color} 
                            style={[styles.colorOption, { backgroundColor: color }]} 
                            onPress={() => handleUpdateTier(tier.id, { color })}
                          />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.tierLabelText}>{tier.label}</Text>
                  )}
                  {isEditingConfig && (
                    <View style={styles.tierControls}>
                      <TouchableOpacity onPress={() => index > 0 && moveTier(index, index - 1)}>
                        <Text style={styles.controlText}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => index < tierConfig.length - 1 && moveTier(index, index + 1)}>
                        <Text style={styles.controlText}>↓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveTier(tier.id)}>
                        <Text style={[styles.controlText, { color: 'red' }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.tierBooks}>
                  {localBooks.filter(b => b.ranking === tier.id).map(book => (
                    <TouchableOpacity key={book.id} onPress={() => setSelectedBook(book)}>
                      <Image
                        source={{ uri: book.smallThumbnail }}
                        style={styles.bookThumbnail}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {isEditingConfig && (
              <TouchableOpacity style={styles.addTierButton} onPress={handleAddTier}>
                <Text style={styles.addTierButtonText}>+ Add Tier</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Unranked Books</Text>
            <View style={styles.unrankedGrid}>
              {unrankedBooks.map(book => (
                <TouchableOpacity 
                  key={book.id} 
                  style={styles.unrankedItem}
                  onPress={() => setSelectedBook(book)}
                >
                   <Image
                      source={{ uri: book.smallThumbnail }}
                      style={styles.bookThumbnailLarge}
                    />
                    <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Hidden ViewShot for Export only */}
          <View style={{ position: 'absolute', left: -5000 }}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: '#1A1A18', width: finalExportWidth }}>
              <View style={{ flexDirection: 'row' }}>
                {/* Left Side: Tier List */}
                <View style={{ width: TIER_LIST_EXPORT_WIDTH }}>
                  {tierConfig.map((tier, index) => (
                    <View key={tier.id} style={[styles.tierRowExport, { width: TIER_LIST_EXPORT_WIDTH, height: tierHeights[index] }]}>
                      <View style={[styles.tierLabel, { backgroundColor: tier.color, width: EXPORT_LABEL_WIDTH }]}>
                        <Text style={[styles.tierLabelText, { fontSize: 32 }]}>{tier.label}</Text>
                      </View>
                      <View style={[styles.tierBooks, { padding: EXPORT_PADDING, gap: EXPORT_GAP }]}>
                        {localBooks.filter(b => b.ranking === tier.id).map(book => (
                          <Image
                            key={book.id}
                            source={{ uri: book.smallThumbnail }}
                            style={[styles.bookThumbnail, { width: EXPORT_BOOK_WIDTH, height: EXPORT_BOOK_HEIGHT }]}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Right Side: Scaled Bookshelf */}
                <View style={{ width: shelfExportWidth, height: totalTierHeight, overflow: 'hidden' }}>
                  <View style={{ transform: [{ scale: shelfScale }], transformOrigin: 'top left' }}>
                    <View style={[styles.realShelfContainer, { height: shelfImageHeight }]}>
                      <Image 
                        source={shelfImage} 
                        style={{ width: SCREEN_WIDTH, height: shelfImageHeight }} 
                        resizeMode="cover" 
                      />
                      <BookshelfOverlay
                        books={rankedBooks}
                        patternHeights={[shelfImageHeight]}
                        totalContentHeight={shelfImageHeight}
                        topOffset={0}
                        onBooksReorder={() => {}} 
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Bottom: Stats Text (Subscript) */}
              <View style={styles.footerExportSection}>
                <Text style={styles.statsTextExport}>{rankedBooks.length} Books Ranked</Text>
                <View style={styles.brandingExport}>
                  <Image 
                    source={require('../assets/1024x1024.png')} 
                    style={styles.appIconExport}
                  />
                  <Text style={styles.appNameExport}>Shelf52</Text>
                </View>
              </View>
            </ViewShot>
          </View>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportImage}
          >
            <Text style={styles.exportButtonText}>Export Image</Text>
          </TouchableOpacity>
        </Animated.View>
        {renderTierPicker()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: SHEET_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editConfigText: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 4,
  },
  closeText: {
    color: '#007AFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  realShelfContainer: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  footerExportSection: {
    padding: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1A1A18',
  },
  statsTextExport: {
    fontSize: 24,
    color: '#999',
    fontWeight: '600',
  },
  brandingExport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appIconExport: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  appNameExport: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  tierRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    minHeight: 80,
  },
  tierRowExport: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#10110E',
    minHeight: 80,
  },
  tierLabel: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  tierLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tierLabelInput: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 5,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  colorOption: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  tierControls: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  controlText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tierBooks: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
  },
  bookThumbnail: {
    width: 40,
    height: 60,
    borderRadius: 4,
  },
  addTierButton: {
    margin: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
  },
  addTierButtonText: {
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
  },
  unrankedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    paddingBottom: 40,
    gap: 15,
  },
  unrankedItem: {
    width: (SHEET_WIDTH - 60) / 3,
    alignItems: 'center',
  },
  bookThumbnailLarge: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 8,
  },
  bookTitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  exportButton: {
    backgroundColor: '#000',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerTiers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  pickerTierButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  pickerTierText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pickerCancel: {
    padding: 10,
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
});
