/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useRef } from 'react';
import { StatusBar, View, Image, FlatList, Platform, Animated, Text } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { styles } from './view/styles/Main';

// Generate a large array of items for infinite scrolling
const generateItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({ id: i.toString() }));
};

const ITEM_COUNT = 1000; // Large enough to feel infinite

function App() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const isScrollingDown = useRef(false);
  const isVisible = useRef(true);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const threshold = 10; // Minimum scroll distance to trigger hide/show

        if (currentScrollY < threshold) {
          // At top, always show
          if (!isVisible.current) {
            isVisible.current = true;
            Animated.spring(scrollDirection, {
              toValue: 1,
              useNativeDriver: false,
            }).start();
          }
        } else {
          const scrollingDown = currentScrollY > lastScrollY.current + threshold;
          const scrollingUp = currentScrollY < lastScrollY.current - threshold;

          if (scrollingDown && !isScrollingDown.current && isVisible.current) {
            isScrollingDown.current = true;
            isVisible.current = false;
            Animated.spring(scrollDirection, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          } else if (scrollingUp && isScrollingDown.current && !isVisible.current) {
            isScrollingDown.current = false;
            isVisible.current = true;
            Animated.spring(scrollDirection, {
              toValue: 1,
              useNativeDriver: false,
            }).start();
          }
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  const navBarTranslateY = scrollDirection.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, -20],
  });

  const bottomBarTranslateY = scrollDirection.interpolate({
    inputRange: [0, 1],
    outputRange: [150, 0],
  });

  const barOpacity = scrollDirection;

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.appContainer}>
        <AppContent onScroll={handleScroll} />
        {/* Static white background for status bar area */}
        <SafeAreaView style={styles.statusBarArea} edges={['top']} pointerEvents="none" />
        {/* Navigation bar that slides out */}
        <SafeAreaView style={styles.topSafeArea} edges={['top']} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.navBarContainer,
              {
                transform: [{ translateY: navBarTranslateY }],
                opacity: barOpacity,
              },
            ]}
          >
            <NavigationBar />
          </Animated.View>
        </SafeAreaView>
        {/* Bottom tab bar that slides out */}
        <Animated.View
          style={[
            styles.bottomTabBarContainer,
            {
              transform: [{ translateY: bottomBarTranslateY }],
              opacity: barOpacity,
            },
          ]}
        >
          <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} pointerEvents="box-none">

            

            <BottomTabBar />

          </SafeAreaView>
        </Animated.View>
      </View>
    </SafeAreaProvider >
  );
}

function NavigationBar() {
  return (
    <View style={styles.navBar}>
      <Text style={styles.topBarTitle}>Library</Text>
    </View>
  );
}

function BottomTabBar() {
  return (
    <View style={styles.bottomTabBar}>
      <Image
        source={require('./assets/books_icon.png')}
        style={styles.bottomTabBarIcon}
        resizeMode="cover"
      />
      <Text>Library</Text>
    </View>
  );
}



function AppContent({ onScroll }: { onScroll: any }) {
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
    const ITEM_HEIGHT = 300;
    return {
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    };
  };

  return (
    <View style={styles.container}>

      <FlatList
        data={generateItems(ITEM_COUNT)}
        renderItem={renderLibraryItem}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
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

export default App;
