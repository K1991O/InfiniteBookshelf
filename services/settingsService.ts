import AsyncStorage from '@react-native-async-storage/async-storage';

const SPINE_SHARING_KEY = '@infinite_bookshelf:spine_sharing_enabled';
const HAS_PROMPTED_SPINE_SHARING_KEY = '@infinite_bookshelf:has_prompted_spine_sharing';

export const settingsService = {
  /**
   * Checks if the user has enabled spine sharing.
   * Default is true.
   */
  isSpineSharingEnabled: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(SPINE_SHARING_KEY);
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error getting spine sharing setting:', error);
      return true;
    }
  },

  /**
   * Sets the spine sharing preference.
   */
  setSpineSharingEnabled: async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(SPINE_SHARING_KEY, enabled.toString());
    } catch (error) {
      console.error('Error setting spine sharing preference:', error);
    }
  },

  /**
   * Checks if the user has already been prompted about spine sharing.
   */
  hasPromptedSpineSharing: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(HAS_PROMPTED_SPINE_SHARING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error getting spine sharing prompt status:', error);
      return false;
    }
  },

  /**
   * Marks that the user has been prompted about spine sharing.
   */
  setHasPromptedSpineSharing: async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(HAS_PROMPTED_SPINE_SHARING_KEY, 'true');
    } catch (error) {
      console.error('Error setting spine sharing prompt status:', error);
    }
  },
};

