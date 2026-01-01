import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {styles as mainStyles} from './styles/Main';

interface NavigationBarProps {
  onTierListPress?: () => void;
  onSettingsPress?: () => void;
}

export function NavigationBar({ onTierListPress, onSettingsPress }: NavigationBarProps) {
  return (
    <View style={mainStyles.navBar}>
      <TouchableOpacity 
        style={styles.leftButton} 
        onPress={onTierListPress}
      >
        <Text style={styles.buttonText}>Tiers</Text>
      </TouchableOpacity>
      <Text style={mainStyles.topBarTitle}>Library</Text>
      <TouchableOpacity 
        style={styles.rightButton} 
        onPress={onSettingsPress}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  leftButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },
  rightButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#007AFF', // iOS blue
    fontWeight: '600',
  },
});
