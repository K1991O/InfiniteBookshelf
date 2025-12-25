import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import {styles} from './styles/BookSearchSheetStyles';

interface SearchBarProps {
  searchInputRef: React.RefObject<TextInput | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSubmit: () => void;
  onCameraPress: () => void;
  loading: boolean;
}

export const SearchBar = ({
  searchInputRef,
  searchQuery,
  setSearchQuery,
  onSubmit,
  onCameraPress,
  loading,
}: SearchBarProps) => (
  <TouchableOpacity
    activeOpacity={1}
    onPress={() => searchInputRef.current?.focus()}>
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#564136"
            style={styles.searchIcon}
          />
        ) : (
          <Image
            source={require('../assets/search.png')}
            style={styles.searchIcon}
          />
        )}
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search for books..."
          placeholderTextColor="#828282"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoFocus={false}
          showSoftInputOnFocus={true}
        />
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={onCameraPress}
          activeOpacity={0.7}>
          <Image
            source={require('../assets/camera.png')}
            style={styles.cameraIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);
