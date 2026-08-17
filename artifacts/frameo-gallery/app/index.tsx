import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useFrameo, weatherDescription } from '@/context/FrameoContext';

const demoImages = [require('../assets/images/demo-lake.jpg'), require('../assets/images/demo-canyon.jpg')];

function weatherIcon(code: number) {
  if (code <= 3) return 'sun';
  if (code <= 48) return 'cloud';
  if (code <= 77) return 'cloud-drizzle';
  return 'cloud-lightning';
}

export default function SlideshowScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, hydrated, photos, weather, events, networkError } = useFrameo();
  const [index, setIndex] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [demoIndex, setDemoIndex] = useState(0);
  const dimensions = Dimensions.get('window');
  const isWide = dimensions.width >= 700;
  const demo = hydrated && !config.setupComplete;
  const photo = photos[index % Math.max(photos.length, 1)];
  const nextEvent = events[0];
  const timeLabel = useMemo(() => nextEvent ? nextEvent.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '', [nextEvent]);

  useEffect(() => {
    if (!hydrated) return;
    const seconds = Math.max(5, config.slideshowSeconds || 12);
    const timer = setInterval(() => {
      setIndex((value) => value + 1);
      setDemoIndex((value) => (value + 1) % demoImages.length);
      setShowChrome(false);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [config.slideshowSeconds, hydrated]);

  const handleTap = () => setShowChrome((value) => !value);
  const shownDemo = demoImages[demoIndex];

  return <View style={[styles.root, { backgroundColor: colors.background }]} testID="slideshow-screen">
    <StatusBar hidden />
    {demo ? <ExpoImage source={shownDemo} cachePolicy="disk" contentFit="cover" style={StyleSheet.absoluteFill} /> : photo ? <ExpoImage source={{ uri: photo.thumbUrl, headers: { 'x-api-key': config.apiKey } }} cachePolicy="disk" contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
    <View style={styles.tint} pointerEvents="none" />
    <Pressable testID="slideshow-tap" style={StyleSheet.absoluteFill} onPress={handleTap} />
    {showChrome ? <View style={[styles.chrome, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: isWide ? 34 : 20 }]} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.brandLockup}><View style={[styles.brandMark, { backgroundColor: colors.primary }]}><Feather name="sunset" size={16} color={colors.primaryForeground} /></View><View><Text style={[styles.brand, { color: colors.foreground }]}>Frameo</Text><Text style={[styles.brandSub, { color: colors.foreground }]}>a window into home</Text></View></View>
        <Pressable testID="open-settings" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}><Feather name="sliders" size={19} color={colors.foreground} /><Text style={[styles.settingsText, { color: colors.foreground }]}>Manage</Text></Pressable>
      </View>
      <View style={styles.spacer} />
      <View style={styles.bottomRow}>
        <View style={styles.infoColumn}>
          {demo ? <View style={[styles.previewPill, { backgroundColor: colors.accent }]}><Feather name="eye" size={13} color={colors.accentForeground} /><Text style={[styles.previewText, { color: colors.accentForeground }]}>Preview gallery</Text></View> : null}
          {config.albumName ? <Text style={[styles.albumName, { color: colors.foreground }]}>{config.albumName}</Text> : null}
          {photo ? <Text style={[styles.photoName, { color: colors.foreground }]} numberOfLines={1}>{photo.name}</Text> : null}
          {!demo && !photo ? <View style={styles.noPhoto}><Feather name="image" size={21} color={colors.primary} /><Text style={[styles.noPhotoTitle, { color: colors.foreground }]}>Your frame is ready for a memory</Text><Text style={[styles.noPhotoDetail, { color: colors.foreground }]}>Choose an Immich album in Manage to begin.</Text></View> : null}
          {networkError && !demo ? <Text style={[styles.offline, { color: colors.foreground }]}><Feather name="wifi-off" size={12} color={colors.foreground} />  Last known view · offline</Text> : null}
        </View>
        <View style={styles.ambientRow}>
          {weather ? <View style={[styles.ambientChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={weatherIcon(weather.code) as keyof typeof Feather.glyphMap} size={16} color={colors.primary} /><View><Text style={[styles.chipValue, { color: colors.foreground }]}>{weather.temperature}°</Text><Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>{weather.place}</Text></View></View> : null}
          {nextEvent ? <View style={[styles.ambientChip, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="calendar" size={16} color={colors.accent} /><View><Text style={[styles.chipValue, { color: colors.foreground }]} numberOfLines={1}>{nextEvent.title}</Text><Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>{timeLabel}</Text></View></View> : null}
        </View>
      </View>
    </View> : null}
    {demo && showChrome ? <View style={[styles.setupHint, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.setupHintTitle, { color: colors.foreground }]}>This is a private preview</Text><Text style={[styles.setupHintCopy, { color: colors.mutedForeground }]}>Connect your own Immich album and these moments become the frame.</Text><Pressable testID="setup-now" onPress={() => router.push('/settings')} style={[styles.setupButton, { backgroundColor: colors.primary }]}><Text style={[styles.setupButtonText, { color: colors.primaryForeground }]}>Set up your frame</Text><Feather name="arrow-up-right" size={17} color={colors.primaryForeground} /></Pressable></View> : null}
    <Pressable testID="fullscreen-button" accessibilityLabel="Open full-screen slideshow" onPress={() => router.push('/fullscreen')} style={[styles.fullscreenButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="maximize-2" size={17} color={colors.foreground} /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: '100%', overflow: 'hidden' },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,16,25,0.16)' },
  chrome: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.4 },
  brandSub: { fontFamily: 'Inter_400Regular', fontSize: 10, opacity: 0.85 },
  settingsButton: { borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 10 },
  settingsText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  spacer: { flex: 1 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18 },
  infoColumn: { flex: 1, gap: 5 },
  previewPill: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  previewText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  albumName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  photoName: { fontFamily: 'Inter_400Regular', fontSize: 13, opacity: 0.9, maxWidth: 380 },
  offline: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 3 },
  ambientRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '58%' },
  ambientChip: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 9, minWidth: 105 },
  chipValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, maxWidth: 118 },
  chipLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2, maxWidth: 118 },
  noPhoto: { gap: 4 },
  noPhotoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  noPhotoDetail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  setupHint: { position: 'absolute', left: 28, bottom: 106, width: 270, padding: 17, borderRadius: 18, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  setupHintTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 5 },
  setupHintCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginBottom: 13 },
  setupButton: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  setupButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  fullscreenButton: { position: 'absolute', right: 20, bottom: 20, width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});