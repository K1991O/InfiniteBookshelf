/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View, Image, FlatList, Dimensions } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Generate a large array of items for infinite scrolling
const generateItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({ id: i.toString() }));
};

const ITEM_COUNT = 1000; // Large enough to feel infinite

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const renderLibraryItem = ({ item }: { item: { id: string } }) => {
    return (
      <Image
        source={require('./assets/library_2.jpg')}
        style={styles.libraryItem}
        resizeMode="cover"
      />
    );
  };

  const getItemLayout = (_: any, index: number) => {
    // Assuming library_2.jpg has a height, adjust this based on actual image dimensions
    // For now, using a reasonable estimate - you may need to adjust this
    const ITEM_HEIGHT = 300; // Adjust based on your image aspect ratio
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    };
  };

  return (
    <View style={styles.container}>
      {/* Main library_4.jpg image at the top */}
      <Image
        source={require('./assets/library_4.jpg')}
        style={styles.mainImage}
        resizeMode="cover"
      />
      
      {/* Infinite scrolling library_2.jpg images */}
      <FlatList
        data={generateItems(ITEM_COUNT)}
        renderItem={renderLibraryItem}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={3}
        windowSize={5}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: 300, // Adjust based on your image aspect ratio
  },
  list: {
    flex: 1,
  },
  libraryItem: {
    width: SCREEN_WIDTH,
    height: 300, // Adjust based on your image aspect ratio
  },
});

export default App;
