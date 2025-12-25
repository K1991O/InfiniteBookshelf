import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import {Book as ApiBook} from '../services/booksApi';
import {styles} from './styles/BookSearchSheetStyles';

interface SearchResultItemProps {
  item: ApiBook;
  onPress: (item: ApiBook) => void;
}

export const SearchResultItem = ({item, onPress}: SearchResultItemProps) => (
  <TouchableOpacity
    style={styles.bookItem}
    onPress={() => onPress(item)}
    activeOpacity={0.7}>
    {item.smallThumbnail || item.thumbnail ? (
      <Image
        source={{uri: item.smallThumbnail || item.thumbnail || ''}}
        style={styles.bookCover}
      />
    ) : (
      <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
        <Text style={styles.bookCoverPlaceholderText}>📚</Text>
      </View>
    )}
    <View style={styles.bookInfo}>
      <Text style={styles.bookTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.bookSubtitle} numberOfLines={1}>
        {item.subtitle || item.authors?.join(', ') || 'Unknown Author'}
      </Text>
    </View>
  </TouchableOpacity>
);
