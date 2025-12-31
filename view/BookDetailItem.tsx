import React, { memo } from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import {Book} from '../types/Book';
import {TierConfig} from '../services/bookStorage';
import {styles} from './styles/BookDetailSheetStyles';

interface BookDetailItemProps {
  book: Book;
  index: number;
  currentIndex: number;
  onAddSpineImage: () => void;
  onDeleteBook: () => void;
  onRankBook: (ranking: string | undefined) => void;
  tierConfig: TierConfig[];
}

export const BookDetailItem = memo(({
  book,
  index,
  currentIndex,
  onAddSpineImage,
  onDeleteBook,
  onRankBook,
  tierConfig,
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

      <View style={styles.rankingContainer}>
        {tierConfig.map(tier => (
          <TouchableOpacity
            key={tier.id}
            style={[
              styles.rankingButton,
              book.ranking === tier.id && { backgroundColor: tier.color, borderColor: tier.color },
            ]}
            onPress={() => onRankBook(book.ranking === tier.id ? undefined : tier.id)}
            disabled={index !== currentIndex}>
            <Text
              style={[
                styles.rankingButtonText,
                book.ranking === tier.id && styles.rankingButtonTextActive,
              ]}>
              {tier.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
), (prevProps, nextProps) => {
  return (
    prevProps.book.id === nextProps.book.id &&
    prevProps.book.ranking === nextProps.book.ranking &&
    prevProps.book.spineThumbnail === nextProps.book.spineThumbnail &&
    prevProps.index === nextProps.index &&
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.tierConfig === nextProps.tierConfig
  );
});
