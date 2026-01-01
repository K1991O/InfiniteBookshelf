import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadBooks } from './bookStorage';

const RATING_PROMPTED_KEY = '@infinite_bookshelf:rating_prompted';

// Replace with your actual App Store ID and Package Name
const APP_STORE_ID = '6741481514'; 
const ANDROID_PACKAGE_NAME = 'com.shelf52.infinitebookshelf';

/**
 * Checks if the user has added at least 5 books with spine images 
 * and prompts for a rating if they haven't been prompted before.
 */
export async function checkAndPromptRating() {
  try {
    // Check if user has already been prompted
    const hasBeenPrompted = await AsyncStorage.getItem(RATING_PROMPTED_KEY);
    if (hasBeenPrompted === 'true') {
      return;
    }

    // Load books and count those with spines
    const books = await loadBooks();
    const booksWithSpines = books.filter(book => !!book.spineThumbnail);

    console.log(`Rating check: ${booksWithSpines.length} books with spines found.`);

    if (booksWithSpines.length >= 5) {
      Alert.alert(
        'Enjoying Shelf52?',
        "It looks like you've added 5 books with spines to your shelf! We'd love to hear from you. It would help us a lot if you could give us a 5-star rating on the App Store.",
        [
          {
            text: 'Maybe Later',
            style: 'cancel',
          },
          {
            text: 'Rate Now',
            onPress: async () => {
              // Mark as prompted so we don't ask again
              await AsyncStorage.setItem(RATING_PROMPTED_KEY, 'true');
              
              const url = Platform.OS === 'ios'
                ? `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`
                : `market://details?id=${ANDROID_PACKAGE_NAME}`;
              
              try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  // Fallback for browser if app store link doesn't work
                  const browserUrl = Platform.OS === 'ios'
                    ? `https://apps.apple.com/app/id${APP_STORE_ID}`
                    : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
                  await Linking.openURL(browserUrl);
                }
              } catch (error) {
                console.error('Error opening rating URL:', error);
              }
            },
          },
          {
            text: "Don't ask again",
            onPress: async () => {
              await AsyncStorage.setItem(RATING_PROMPTED_KEY, 'true');
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error('Error checking rating prompt:', error);
  }
}

