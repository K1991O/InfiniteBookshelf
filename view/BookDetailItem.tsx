import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import {Book} from '../types/Book';
import {styles} from './styles/BookDetailSheetStyles';

interface BookDetailItemProps {
  book: Book;
  index: number;
  currentIndex: number;
  onAddSpineImage: () => void;
  onDeleteBook: () => void;
}

export const BookDetailItem = ({
  book,
  index,
  currentIndex,
  onAddSpineImage,
  onDeleteBook,
}: BookDetailItemProps) => (
  <View style={styles.bookItem}>
    {book.smallThumbnail ? (
      <Image
        source={{uri: book.smallThumbnail}}
        style={styles.thumbnail}
        resizeMode="cover"
      />
    ) : (
      <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
        <Text style={styles.thumbnailPlaceholderText}>📚</Text>
      </View>
    )}
    <View style={styles.bookInfo}>
      <Text style={styles.title} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {book.author}
      </Text>

      <TouchableOpacity
        style={styles.spineButton}
        onPress={onAddSpineImage}
        activeOpacity={0.7}
        disabled={index !== currentIndex}>
        <Text style={styles.spineButtonText}>
          {book.spineThumbnail ? 'Retake Spine Photo' : 'Take Spine Photo'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDeleteBook}
        activeOpacity={0.7}
        disabled={index !== currentIndex}>
        <Text style={styles.deleteButtonText}>Delete Book</Text>
      </TouchableOpacity>
    </View>
  </View>
);
