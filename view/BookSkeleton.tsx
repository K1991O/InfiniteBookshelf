import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { SHELF_HEIGHT_CM } from '../types/Book';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for positioning - must match BookshelfOverlay
const SHELF_HEIGHT_TO_WIDTH_RATIO = 0.5;

interface BookSkeletonProps {
  thickness?: number; // in cm, defaults to average book thickness
  height?: number; // in cm, defaults to average book height
}

export function BookSkeleton({ 
  thickness = 2.5, // Default average book thickness
  height = 20 // Default average book height
}: BookSkeletonProps) {
  const strobeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create strobing animation
    const strobeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(strobeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(strobeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );

    strobeAnimation.start();

    return () => {
      strobeAnimation.stop();
    };
  }, [strobeAnim]);

  // Calculate dimensions - must match BookshelfOverlay calculation
  const ShelfHeight = SCREEN_WIDTH * SHELF_HEIGHT_TO_WIDTH_RATIO;
  const bookWidthPx = (thickness / SHELF_HEIGHT_CM) * ShelfHeight;
  const actualBookHeight = (ShelfHeight * height / SHELF_HEIGHT_CM);

  // Interpolate opacity for strobing effect
  const opacity = strobeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: bookWidthPx,
          height: actualBookHeight,
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    marginRight: 2,
    borderRadius: 4,
    backgroundColor: '#D9D9D9',
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});



