/**
 * Infinite Bookshelf App
 *
 * @format
 */

import React, { useRef, useState } from 'react';
import { StatusBar, View, Platform, Animated } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { styles } from './view/styles/Main';
import { LibraryView } from './view/LibraryView';
import { NavigationBar } from './view/NavigationBar';
import { BottomTabBar } from './view/BottomTabBar';
import { FloatingActionButton } from './view/FloatingActionButton';
import { BookSearchSheet } from './view/BookSearchSheet';

function App() {
  const [isSearchSheetVisible, setIsSearchSheetVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingBookCount, setLoadingBookCount] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const isScrollingDown = useRef(false);
  const isVisible = useRef(true);

  const handleBookAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setLoadingBookCount(0);
  };

  const handleBookAdding = () => {
    setLoadingBookCount(1);
  };

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
    outputRange: [150, 20],
  });

  const barOpacity = scrollDirection;
  
  const fabTranslateX = scrollDirection.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.appContainer}>
        <LibraryView 
          onScroll={handleScroll} 
          refreshTrigger={refreshTrigger}
          loadingBookCount={loadingBookCount}
        />
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
        {/* Floating Action Button */}
        <Animated.View
          style={[
            {
              transform: [
                { translateX: fabTranslateX },
              ],
              opacity: barOpacity,
            },
          ]}
        >
          <FloatingActionButton onPress={() => {
            setIsSearchSheetVisible(true);
          }} />
        </Animated.View>
        {/* Book Search Sheet */}
        <BookSearchSheet
          visible={isSearchSheetVisible}
          onClose={() => {
            setIsSearchSheetVisible(false);
            setLoadingBookCount(0);
          }}
          onBookAdded={handleBookAdded}
          onBookAdding={handleBookAdding}
        />
      </View>
    </SafeAreaProvider >
  );
}


export default App;
