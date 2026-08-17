import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, IconButton, LoadingBlock, PressableScale, SectionHeader, StatusLine } from '@/components/frameo';
import { FrameoConfig, useFrameo, weatherDescription } from '@/context/FrameoContext';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    config, albums, photos, saving, albumsBusy, uploadBusy, albumError, networkError, weather, events,
    refreshAlbums, saveConfig, uploadPhoto, deletePhoto, searchPlace, useDeviceLocation,
  } = useFrameo();
  const [form, setForm] = useState<FrameoConfig>(config);
  const [searching, setSearching] = useState(false);
  const [placeQuery, setPlaceQuery] = useState(config.weatherPlace || config.weatherLabel || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => setForm(config), [config]);
  useEffect(() => setPlaceQuery(config.weatherPlace || config.weatherLabel || ''), [config.weatherLabel, config.weatherPlace]);

  const update = (patch: Partial<FrameoConfig>) => setForm((current) => ({ ...current, ...patch }));
  const save = async () => {
    if (!form.serverUrl.trim() || !form.apiKey.trim()) {
      Alert.alert('Immich details needed', 'Add your server URL and API key before saving the photo source.');
      return;
    }
    if (!/^https?:\/\//i.test(form.serverUrl.trim())) {
      Alert.alert('Check the server URL', 'Include https:// (or http:// for a local server).');
      return;
    }
    await saveConfig({ ...form, serverUrl: form.serverUrl.trim(), setupComplete: true });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2600);
  };

  const findPlace = async () => {
    if (!placeQuery.trim()) return;
    setSearching(true);
    try {
      const result = await searchPlace(placeQuery);
      if (!result) {
        Alert.alert('Place not found', 'Try a nearby city or town.');
      } else {
        update({ weatherPlace: placeQuery, weatherLabel: result.label, weatherLat: result.latitude, weatherLon: result.longitude });
        setPlaceQuery(result.label);
      }
    } catch (error) {
      Alert.alert('Could not search', error instanceof Error ? error.message : 'Try again when you are online.');
    } finally {
      setSearching(false);
    }
  };

  const findLocation = async () => {
    setSearching(true);
    try {
      const result = await useDeviceLocation();
      if (result) {
        update({ weatherPlace: '', weatherLabel: result.label, weatherLat: result.latitude, weatherLon: result.longitude });
        setPlaceQuery(result.label);
      }
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Location permission was not granted.');
    } finally {
      setSearching(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Remove this memory?', 'It will leave this frame album but remain safely in your Immich library.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove from album', style: 'destructive', onPress: () => deletePhoto(id) },
    ]);
  };

  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 24) }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable testID="back-to-frame" accessibilityLabel="Back to frame" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.65 : 1 }]}><Feather name="arrow-left" size={18} color={colors.foreground} /><Text style={[styles.backText, { color: colors.foreground }]}>Frame</Text></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.kicker, { color: colors.primary }]}>FRAMEO / MANAGE</Text><Text style={[styles.title, { color: colors.foreground }]}>Make it yours.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A quiet place for the people and places you keep close.</Text></View>
        <View style={styles.headerAction}><PressableScale testID="save-settings" disabled={saving} onPress={save} style={[styles.saveButton, { backgroundColor: colors.primary }]}><Feather name={savedNotice ? 'check' : 'save'} size={16} color={colors.primaryForeground} /><Text style={[styles.saveText, { color: colors.primaryForeground }]}>{saving ? 'Saving' : savedNotice ? 'Saved' : 'Save changes'}</Text></PressableScale></View>
      </View>

      {networkError ? <Pressable onPress={() => undefined} style={[styles.offlineBanner, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={17} color={colors.accent} /><View style={styles.bannerCopy}><Text style={[styles.bannerTitle, { color: colors.foreground }]}>Using last-known details</Text><Text style={[styles.bannerDetail, { color: colors.mutedForeground }]}>{networkError}</Text></View></Pressable> : null}

      <View style={styles.columns}>
        <View style={styles.mainColumn}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader eyebrow="01 / SOURCE" title="Your Immich album" detail="Frameo reads one album from your server. Your API key stays on this device." />
            <Field testID="server-url" label="Server URL" value={form.serverUrl} onChangeText={(serverUrl) => update({ serverUrl })} placeholder="https://photos.example.com" keyboardType="url" />
            <Field testID="api-key" label="API key" value={form.apiKey} onChangeText={(apiKey) => update({ apiKey })} placeholder="Paste an Immich API key" secureTextEntry keyboardType="default" />
            <View style={styles.inlineAction}><PressableScale testID="find-albums" disabled={albumsBusy} onPress={refreshAlbums} style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.secondary }]}><Feather name="refresh-cw" size={16} color={colors.foreground} /><Text style={[styles.secondaryText, { color: colors.foreground }]}>{albumsBusy ? 'Looking for albums' : 'Find albums'}</Text></PressableScale><Text style={[styles.helper, { color: colors.mutedForeground }]}>{albums.length ? `${albums.length} albums found` : 'Connect to choose your folder'}</Text></View>
            {albumError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{albumError}</Text> : null}
            {albumsBusy ? <LoadingBlock label="Reading your albums" /> : albums.length ? <View style={styles.albumList}>{albums.map((album) => <PressableScale key={album.id} testID={`album-${album.id}`} onPress={() => { update({ albumId: album.id, albumName: album.albumName }); saveConfig({ albumId: album.id, albumName: album.albumName, setupComplete: true }); }} style={[styles.albumRow, { borderColor: form.albumId === album.id ? colors.primary : colors.border, backgroundColor: form.albumId === album.id ? colors.muted : colors.input }]}><View style={[styles.albumIcon, { backgroundColor: form.albumId === album.id ? colors.primary : colors.secondary }]}><Feather name={form.albumId === album.id ? 'check' : 'folder'} size={16} color={form.albumId === album.id ? colors.primaryForeground : colors.foreground} /></View><View style={styles.albumCopy}><Text style={[styles.albumTitle, { color: colors.foreground }]}>{album.albumName}</Text><Text style={[styles.albumMeta, { color: colors.mutedForeground }]}>{album.assetCount ?? '—'} memories</Text></View></PressableScale>)}</View> : <View style={[styles.albumPlaceholder, { borderColor: colors.border }]}><Feather name="folder" size={20} color={colors.primary} /><Text style={[styles.albumPlaceholderText, { color: colors.mutedForeground }]}>{form.albumName ? `Selected: ${form.albumName}` : 'Your albums will appear here.'}</Text></View>}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader eyebrow="02 / AMBIENT" title="A little context" detail="Keep the frame useful without turning it into a dashboard." />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Weather place</Text>
            <View style={styles.searchRow}><View style={styles.searchField}><Field testID="weather-place" label="" value={placeQuery} onChangeText={setPlaceQuery} placeholder="Search a city or town" /></View><Pressable testID="search-weather" onPress={findPlace} disabled={searching} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed || searching ? 0.65 : 1 }]}><Feather name="search" size={18} color={colors.foreground} /></Pressable></View>
            <PressableScale testID="use-location" disabled={searching} onPress={findLocation} style={[styles.locationButton, { borderColor: colors.border, backgroundColor: colors.input }]}><Feather name="navigation" size={16} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.foreground }]}>{searching ? 'Locating' : 'Use device location'}</Text></PressableScale>
            {form.weatherLabel ? <StatusLine label={form.weatherLabel} ok={!!weather} detail={weather ? `${weather.temperature}° · ${weatherDescription(weather.code)}` : 'Saved location · weather will appear when online'} /> : null}
            <Field testID="ical-url" label="Shared calendar URL (optional)" value={form.icalUrl} onChangeText={(icalUrl) => update({ icalUrl })} placeholder="https://calendar.example.com/family.ics" keyboardType="url" />
            <View style={styles.timingRow}><View style={styles.timingCopy}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Change photos every</Text><Text style={[styles.helper, { color: colors.mutedForeground }]}>Long enough to settle into a memory.</Text></View><View style={[styles.stepper, { borderColor: colors.border, backgroundColor: colors.input }]}><Pressable testID="slideshow-decrease" onPress={() => update({ slideshowSeconds: Math.max(5, form.slideshowSeconds - 1) })} style={styles.stepButton}><Feather name="minus" size={16} color={colors.foreground} /></Pressable><Text style={[styles.stepValue, { color: colors.foreground }]}>{form.slideshowSeconds}s</Text><Pressable testID="slideshow-increase" onPress={() => update({ slideshowSeconds: Math.min(60, form.slideshowSeconds + 1) })} style={styles.stepButton}><Feather name="plus" size={16} color={colors.foreground} /></Pressable></View></View>
            {events.length ? <StatusLine label={`${events.length} upcoming events`} ok detail={`Next: ${events[0].title}`} /> : null}
          </View>
        </View>

        <View style={styles.sideColumn}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader eyebrow="03 / MEMORIES" title={form.albumName || 'Photo shelf'} detail={photos.length ? `${photos.length} memories in this album.` : 'Upload a first memory or choose an album above.'} />
            <IconButton testID="upload-photo" icon="upload" label={uploadBusy ? 'Uploading memory' : 'Upload from device'} onPress={uploadPhoto} disabled={uploadBusy || !config.albumId} />
            {!photos.length ? <View style={styles.shelfEmpty}><Feather name="image" size={23} color={colors.primary} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>No server photos loaded yet.</Text></View> : <View style={styles.photoGrid}>{photos.slice(0, 12).map((photo) => <PressableScale key={photo.id} testID={`photo-${photo.id}`} onPress={() => setSelectedPhoto(photo.id)} style={[styles.photoTile, { borderColor: selectedPhoto === photo.id ? colors.primary : colors.border }]}><ExpoPhoto url={photo.thumbUrl} apiKey={config.apiKey} /><View style={[styles.photoOverlay, { backgroundColor: selectedPhoto === photo.id ? colors.primary : 'transparent' }]}>{selectedPhoto === photo.id ? <Feather name="check" size={15} color={colors.primaryForeground} /> : null}</View></PressableScale>)}</View>}
            {selectedPhoto ? <PressableScale testID="delete-photo" onPress={() => confirmDelete(selectedPhoto)} style={[styles.deleteButton, { backgroundColor: colors.destructive }]}><Feather name="trash-2" size={16} color={colors.destructiveForeground} /><Text style={[styles.secondaryText, { color: colors.destructiveForeground }]}>Delete selected memory</Text></PressableScale> : null}
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader eyebrow="READY CHECK" title="The frame at a glance" />
            <View style={styles.statusStack}><StatusLine label="Immich source" ok={!!form.serverUrl && !!form.apiKey && !!form.albumId} detail={form.albumName || 'Choose an album to start'} /><StatusLine label="Weather" ok={!!form.weatherLat} detail={form.weatherLabel || 'Optional'} /><StatusLine label="Calendar" ok={!!form.icalUrl} detail={form.icalUrl ? 'Shared feed connected' : 'Optional'} /></View>
          </View>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function ExpoPhoto({ url, apiKey }: { url: string; apiKey: string }) {
  return <ExpoImage source={{ uri: url, headers: { 'x-api-key': apiKey } }} cachePolicy="disk" contentFit="cover" style={styles.photoImage} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: '100%' },
  scroll: { paddingHorizontal: 20, alignSelf: 'center', width: '100%', maxWidth: 1180 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, marginBottom: 23 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { paddingTop: 1 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  saveButton: { minHeight: 43, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 15, padding: 12, marginBottom: 17 },
  bannerCopy: { flex: 1, gap: 2 },
  bannerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  bannerDetail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 17 },
  mainColumn: { flex: 1.12, gap: 17 },
  sideColumn: { flex: 0.88, gap: 17 },
  card: { borderRadius: 20, borderWidth: 1, padding: 18 },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  secondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.3 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 10 },
  albumList: { gap: 8 },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 13, padding: 10 },
  albumIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  albumCopy: { flex: 1, gap: 2 },
  albumTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  albumMeta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  albumPlaceholder: { minHeight: 58, borderWidth: 1, borderStyle: 'dashed', borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  albumPlaceholderText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 7 },
  searchField: { flex: 1 },
  searchButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  locationButton: { minHeight: 43, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 17 },
  timingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginVertical: 4 },
  timingCopy: { flex: 1, gap: 3 },
  stepper: { height: 42, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  stepButton: { width: 37, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 38, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 12 },
  statusStack: { gap: 9 },
  shelfEmpty: { minHeight: 100, justifyContent: 'center', alignItems: 'center', gap: 9 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 17 },
  photoTile: { width: '30.5%', aspectRatio: 1, borderRadius: 11, borderWidth: 2, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', right: 5, top: 5, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { marginTop: 14, borderRadius: 12, minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});