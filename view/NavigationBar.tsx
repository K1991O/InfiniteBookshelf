import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles/Main';

export function NavigationBar() {
  return (
    <View style={styles.navBar}>
      <Text style={styles.topBarTitle}>Library</Text>
    </View>
  );
}
