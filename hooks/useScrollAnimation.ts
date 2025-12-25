import {useRef} from 'react';
import {Animated} from 'react-native';

export const useScrollAnimation = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const isScrollingDown = useRef(false);
  const isVisible = useRef(true);

  const handleScroll = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollY}}}],
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
          const scrollingDown =
            currentScrollY > lastScrollY.current + threshold;
          const scrollingUp = currentScrollY < lastScrollY.current - threshold;

          if (scrollingDown && !isScrollingDown.current && isVisible.current) {
            isScrollingDown.current = true;
            isVisible.current = false;
            Animated.spring(scrollDirection, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          } else if (
            scrollingUp &&
            isScrollingDown.current &&
            !isVisible.current
          ) {
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
    },
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

  return {
    handleScroll,
    navBarTranslateY,
    bottomBarTranslateY,
    barOpacity,
    fabTranslateX,
  };
};
