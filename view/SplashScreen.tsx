import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Image } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = SCREEN_WIDTH * 0.382;
const LOGO_ASPECT_RATIO = 819 / 670;
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT_RATIO;

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  useEffect(() => {
    // Transition to main app instantly after a delay
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/splash_background.png')}
        style={styles.background}
        resizeMode="cover"
      />
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 9999,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});

