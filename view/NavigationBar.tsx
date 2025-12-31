import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {styles as mainStyles} from './styles/Main';

interface NavigationBarProps {
  onTierListPress?: () => void;
}

export function NavigationBar({ onTierListPress }: NavigationBarProps) {
  return (
    <View style={mainStyles.navBar}>
      <TouchableOpacity 
        style={styles.leftButton} 
        onPress={onTierListPress}
      >
        <Text style={styles.buttonText}>Tiers</Text>
      </TouchableOpacity>
      <Text style={mainStyles.topBarTitle}>Library</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leftButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#007AFF', // iOS blue
    fontWeight: '600',
  },
});
