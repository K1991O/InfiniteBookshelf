import DeviceInfo from 'react-native-device-info';

/**
 * Service to manage unique user identification.
 */
export const userService = {
  /**
   * Retrieves a unique identifier for the device.
   * On iOS, this returns the identifierForVendor.
   * On Android, this returns the ANDROID_ID.
   * 
   * @returns {Promise<string>} A unique device identifier.
   */
  getPersistentUserId: async (): Promise<string> => {
    try {
      const uniqueId = await DeviceInfo.getUniqueId();
      return uniqueId;
    } catch (error) {
      console.error('Error getting unique ID:', error);
      // Fallback to a random ID if something goes wrong, 
      // though this won't be persistent across reinstalls.
      return `anonymous-${Math.random().toString(36).substring(2, 15)}`;
    }
  },

  /**
   * A synchronous version that might return a cached ID or a placeholder.
   * Note: DeviceInfo.getUniqueId is now async in newer versions.
   */
  getUniqueIdSync: () => {
    return DeviceInfo.getUniqueIdSync();
  }
};
