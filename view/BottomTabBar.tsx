import React from 'react';
import { View, Text, Image } from 'react-native';
import { styles } from './styles/Main';

export function BottomTabBar() {
  return (
    <View style={styles.bottomTabBar}>
      <Image
        source={require('../assets/books_icon.png')}
        style={styles.bottomTabBarIcon}
        resizeMode="cover"
      />
      <Text>Library</Text>
    </View>
  );
}
