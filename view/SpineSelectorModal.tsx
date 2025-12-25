import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
} from 'react-native';
import { styles } from './styles/SpineSelectorModalStyles';

interface SpineSelectorModalProps {
    visible: boolean;
    spines: string[];
    onSelect: (url: string) => void;
    onTakePhoto: () => void;
    onClose: () => void;
}

export function SpineSelectorModal({
    visible,
    spines,
    onSelect,
    onTakePhoto,
    onClose,
}: SpineSelectorModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.title}>Choose a Spine</Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <TouchableOpacity
                            style={styles.takePhotoButton}
                            onPress={onTakePhoto}
                            activeOpacity={0.7}
                        >
                            <Text style={{ fontSize: 30 }}>📸</Text>
                            <Text style={styles.takePhotoText}>Take new photo</Text>
                        </TouchableOpacity>

                        {spines.map((url, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.spineItem}
                                onPress={() => onSelect(url)}
                                activeOpacity={0.8}
                            >
                                <Image source={{ uri: url }} style={styles.spineImage} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
