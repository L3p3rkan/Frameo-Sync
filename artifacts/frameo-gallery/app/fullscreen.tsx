import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFrameo } from '@/context/FrameoContext';
import { useColors } from '@/hooks/useColors';

const demoImages = [require('../assets/images/demo-lake.jpg'), require('../assets/images/demo-canyon.jpg')];

export default function FullscreenScreen() {
  const colors = useColors();
  const router = useRouter();
  const { config, photos } = useFrameo();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => current + 1), Math.max(5, config.slideshowSeconds) * 1000);
    return () => clearInterval(timer);
  }, [config.slideshowSeconds]);
  const photo = photos[index % Math.max(photos.length, 1)];
  const source = !config.setupComplete ? demoImages[index % demoImages.length] : photo ? { uri: photo.originalUrl, headers: { 'x-api-key': config.apiKey } } : null;
  return <View style={[styles.root, { backgroundColor: colors.background }]}><StatusBar hidden /><Pressable testID="fullscreen-exit" style={StyleSheet.absoluteFill} onPress={() => router.back()}>{source ? <ExpoImage source={source} cachePolicy="disk" contentFit="contain" style={StyleSheet.absoluteFill} /> : null}</Pressable></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, minHeight: '100%' } });