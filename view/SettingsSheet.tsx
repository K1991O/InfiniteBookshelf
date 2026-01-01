import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { settingsService } from '../services/settingsService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    const loadSettings = async () => {
      const enabled = await settingsService.isSpineSharingEnabled();
      setSharingEnabled(enabled);
    };
    if (visible) {
      loadSettings();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const toggleSharing = async (value: boolean) => {
    setSharingEnabled(value);
    await settingsService.setSpineSharingEnabled(value);
    // Ensure marked as prompted if they change it here
    await settingsService.setHasPromptedSpineSharing();
  };

  if (!visible && slideAnim._value === SCREEN_HEIGHT) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Share Spines</Text>
                <Text style={styles.settingDescription}>
                  Contribute your book spines to the community library and get access to spines uploaded by others.
                </Text>
              </View>
              <Switch
                value={sharingEnabled}
                onValueChange={toggleSharing}
                trackColor={{ false: '#767577', true: '#34C759' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 20,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

