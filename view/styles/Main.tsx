import { Dimensions, StyleSheet } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    topBarTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#000',
    },
    statusBarArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      zIndex: 5,
    },
    topSafeArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    bottomSafeArea: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      zIndex: 10,
    },
    navBarContainer: {
      backgroundColor: '#fff',
    },
    bottomTabBarContainer: {
      backgroundColor: '#fff',
    },
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    mainImage: {
      width: SCREEN_WIDTH,
      height: 300,
    },
    list: {
      flex: 1,
    },
    libraryItem: {
      width: SCREEN_WIDTH,
      height: 300,
    },
    bottomTabBarIcon: {
    marginTop: 10,
      width: 22,
      height: 20,
    },
    navBar: {
      backgroundColor: '#fff',
      height: 64,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomTabBar: {
      backgroundColor: '#fff',
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopWidth: 0,
    },
  });