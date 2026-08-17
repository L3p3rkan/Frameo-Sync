import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type FrameoConfig = {
  serverUrl: string;
  apiKey: string;
  albumId: string;
  albumName: string;
  icalUrl: string;
  weatherPlace: string;
  weatherLabel: string;
  weatherLat: number | null;
  weatherLon: number | null;
  slideshowSeconds: number;
  setupComplete: boolean;
};

export type ImmichAlbum = { id: string; albumName: string; assetCount?: number };
export type FramePhoto = {
  id: string;
  name: string;
  createdAt?: string;
  thumbUrl: string;
  originalUrl: string;
};
export type Weather = { place: string; temperature: number; code: number; isDay: boolean; fetchedAt: string };
export type CalendarEvent = { id: string; title: string; start: Date; end?: Date; allDay?: boolean };

const STORAGE_KEY = '@frameo/config/v1';
const defaultConfig: FrameoConfig = {
  serverUrl: '',
  apiKey: '',
  albumId: '',
  albumName: '',
  icalUrl: '',
  weatherPlace: '',
  weatherLabel: '',
  weatherLat: null,
  weatherLon: null,
  slideshowSeconds: 12,
  setupComplete: false,
};

type FrameoContextValue = {
  config: FrameoConfig;
  hydrated: boolean;
  saving: boolean;
  albums: ImmichAlbum[];
  photos: FramePhoto[];
  weather: Weather | null;
  events: CalendarEvent[];
  busy: boolean;
  albumsBusy: boolean;
  uploadBusy: boolean;
  networkError: string | null;
  albumError: string | null;
  refreshAlbums: () => Promise<void>;
  refreshPhotos: () => Promise<void>;
  refreshAmbient: () => Promise<void>;
  saveConfig: (patch: Partial<FrameoConfig>) => Promise<void>;
  uploadPhoto: () => Promise<boolean>;
  deletePhoto: (id: string) => Promise<boolean>;
  searchPlace: (place: string) => Promise<{ label: string; latitude: number; longitude: number } | null>;
  useDeviceLocation: () => Promise<{ label: string; latitude: number; longitude: number } | null>;
  clearError: () => void;
};

const FrameoContext = createContext<FrameoContextValue | null>(null);

function apiRoot(url: string) {
  return url.trim().replace(/\/+$/, '');
}

async function immichFetch<T>(url: string, key: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', 'x-api-key': key, ...(init?.headers || {}) },
  });
  if (!response.ok) throw new Error(`Immich returned ${response.status}`);
  return response.json() as Promise<T>;
}

function parseIcalDate(value: string) {
  const clean = value.replace(/^.*:/, '').trim();
  if (/^\d{8}$/.test(clean)) {
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00`);
  }
  const normalized = clean.replace(/^(\d{8})T(\d{6})Z$/, '$1T$2.000Z');
  if (/^\d{8}T\d{6}$/.test(clean)) {
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}`);
  }
  return new Date(normalized);
}

function parseCalendar(text: string): CalendarEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: CalendarEvent[] = [];
  let current: Record<string, string> | null = null;
  unfolded.forEach((line) => {
    if (line === 'BEGIN:VEVENT') current = {};
    if (line === 'END:VEVENT' && current) {
      const start = current.DTSTART ? parseIcalDate(current.DTSTART) : null;
      if (start && !Number.isNaN(start.getTime())) {
        events.push({
          id: current.UID || `${start.toISOString()}-${current.SUMMARY || 'event'}`,
          title: current.SUMMARY || 'Untitled event',
          start,
          end: current.DTEND ? parseIcalDate(current.DTEND) : undefined,
          allDay: current.DTSTART?.length <= 8,
        });
      }
      current = null;
    }
    if (current) {
      const separator = line.indexOf(':');
      if (separator > 0) {
        const key = line.slice(0, separator).split(';')[0];
        current[key] = line.slice(separator + 1).replace(/\\n/g, ' ').replace(/\\,/g, ',');
      }
    }
  });
  return events.filter((event) => event.start.getTime() > Date.now() - 60 * 60 * 1000).sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 5);
}

function weatherLabel(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Misty';
  if (code <= 67) return 'Rain nearby';
  if (code <= 77) return 'Snow nearby';
  if (code <= 82) return 'Showers';
  return 'Stormy';
}

export function weatherDescription(code: number) {
  return weatherLabel(code);
}

export function FrameoProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<FrameoConfig>(defaultConfig);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [albums, setAlbums] = useState<ImmichAlbum[]>([]);
  const [photos, setPhotos] = useState<FramePhoto[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [albumsBusy, setAlbumsBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [albumError, setAlbumError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => value && setConfig({ ...defaultConfig, ...JSON.parse(value) }))
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  const saveConfig = useCallback(async (patch: Partial<FrameoConfig>) => {
    setSaving(true);
    const next = { ...config, ...patch };
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
    setSaving(false);
  }, [config]);

  const refreshAlbums = useCallback(async () => {
    if (!config.serverUrl || !config.apiKey) {
      setAlbums([]);
      setAlbumError('Add your Immich server and API key to find albums.');
      return;
    }
    setAlbumsBusy(true);
    setAlbumError(null);
    try {
      const data = await immichFetch<ImmichAlbum[]>(`${apiRoot(config.serverUrl)}/api/albums`, config.apiKey);
      setAlbums(data || []);
    } catch (error) {
      setAlbumError(error instanceof Error ? error.message : 'Albums could not be reached.');
    } finally {
      setAlbumsBusy(false);
    }
  }, [config.apiKey, config.serverUrl]);

  const refreshPhotos = useCallback(async () => {
    if (!config.serverUrl || !config.apiKey || !config.albumId) {
      setPhotos([]);
      return;
    }
    setBusy(true);
    try {
      const data = await immichFetch<{ assets?: Array<{ id: string; originalFileName?: string; createdAt?: string }> }>(
        `${apiRoot(config.serverUrl)}/api/albums/${config.albumId}`,
        config.apiKey,
      );
      const next = (data.assets || []).map((asset) => ({
        id: asset.id,
        name: asset.originalFileName || 'Memory',
        createdAt: asset.createdAt,
        thumbUrl: `${apiRoot(config.serverUrl)}/api/assets/${asset.id}/thumbnail?size=preview`,
        originalUrl: `${apiRoot(config.serverUrl)}/api/assets/${asset.id}/original`,
      }));
      setPhotos(next);
      setNetworkError(null);
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : 'Photos are offline. Showing the last view.');
    } finally {
      setBusy(false);
    }
  }, [config.albumId, config.apiKey, config.serverUrl]);

  const refreshAmbient = useCallback(async () => {
    const jobs: Promise<void>[] = [];
    if (config.weatherLat !== null && config.weatherLon !== null) {
      jobs.push(
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${config.weatherLat}&longitude=${config.weatherLon}&current=temperature_2m,weather_code,is_day&timezone=auto`)
          .then((response) => response.json())
          .then((data) => setWeather({
            place: config.weatherLabel || config.weatherPlace || 'Local weather',
            temperature: Math.round(data.current?.temperature_2m ?? 0),
            code: data.current?.weather_code ?? 0,
            isDay: data.current?.is_day === 1,
            fetchedAt: new Date().toISOString(),
          })),
      );
    }
    if (config.icalUrl) {
      jobs.push(fetch(config.icalUrl).then((response) => response.text()).then((text) => setEvents(parseCalendar(text))));
    }
    if (jobs.length) {
      await Promise.allSettled(jobs).then((results) => {
        if (results.some((result) => result.status === 'rejected')) setNetworkError('Some ambient details are offline. Last-known details remain.');
      });
    }
  }, [config.icalUrl, config.weatherLabel, config.weatherLat, config.weatherLon, config.weatherPlace]);

  useEffect(() => {
    if (!hydrated) return;
    refreshPhotos();
    refreshAmbient();
    const interval = setInterval(() => {
      refreshPhotos();
      refreshAmbient();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hydrated, refreshAmbient, refreshPhotos]);

  const searchPlace = useCallback(async (place: string) => {
    if (!place.trim()) return null;
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`);
    if (!response.ok) throw new Error('Place search is unavailable right now.');
    const data = await response.json();
    const result = data.results?.[0];
    if (!result) return null;
    return { label: [result.name, result.admin1, result.country].filter(Boolean).join(', '), latitude: result.latitude, longitude: result.longitude };
  }, []);

  const useDeviceLocation = useCallback(async () => {
    if (Platform.OS === 'web') {
      return new Promise<{ label: string; latitude: number; longitude: number } | null>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Location is not available in this browser.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ label: 'Current location', latitude: position.coords.latitude, longitude: position.coords.longitude }),
          () => reject(new Error('Location permission was not granted.')),
        );
      });
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Location permission was not granted.');
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { label: 'Current location', latitude: position.coords.latitude, longitude: position.coords.longitude };
  }, []);

  const uploadPhoto = useCallback(async () => {
    if (!config.serverUrl || !config.apiKey || !config.albumId) return false;
    const picker = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.92 });
    if (picker.canceled || !picker.assets[0]) return false;
    const asset = picker.assets[0];
    setUploadBusy(true);
    try {
      const form = new FormData();
      const fileName = asset.fileName || `frameo-${Date.now()}.jpg`;
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((response) => response.blob());
        form.append('assetData', blob, fileName);
      } else {
        form.append('assetData', { uri: asset.uri, name: fileName, type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
      }
      form.append('deviceAssetId', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      form.append('deviceId', 'frameo-gallery');
      form.append('isFavorite', 'false');
      const response = await fetch(`${apiRoot(config.serverUrl)}/api/assets`, { method: 'POST', headers: { 'x-api-key': config.apiKey }, body: form });
      if (!response.ok) throw new Error(`Upload returned ${response.status}`);
      const created = await response.json();
      if (created?.id) {
        await fetch(`${apiRoot(config.serverUrl)}/api/albums/${config.albumId}/assets`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
          body: JSON.stringify({ ids: [created.id] }),
        });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await refreshPhotos();
      return true;
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : 'Upload failed.');
      return false;
    } finally {
      setUploadBusy(false);
    }
  }, [config.albumId, config.apiKey, config.serverUrl, refreshPhotos]);

  const deletePhoto = useCallback(async (id: string) => {
    if (!config.serverUrl || !config.apiKey) return false;
    try {
      const response = await fetch(`${apiRoot(config.serverUrl)}/api/albums/${config.albumId}/assets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!response.ok) throw new Error(`Delete returned ${response.status}`);
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return true;
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : 'Delete failed.');
      return false;
    }
  }, [config.apiKey, config.serverUrl]);

  const value = useMemo(() => ({
    config, hydrated, saving, albums, photos, weather, events, busy, albumsBusy, uploadBusy, networkError, albumError,
    refreshAlbums, refreshPhotos, refreshAmbient, saveConfig, uploadPhoto, deletePhoto, searchPlace, useDeviceLocation,
    clearError: () => setNetworkError(null),
  }), [albumError, albums, albumsBusy, busy, config, deletePhoto, events, hydrated, networkError, photos, refreshAlbums, refreshAmbient, refreshPhotos, saveConfig, searchPlace, saving, uploadBusy, uploadPhoto, useDeviceLocation, weather]);

  return <FrameoContext.Provider value={value}>{children}</FrameoContext.Provider>;
}

export function useFrameo() {
  const value = useContext(FrameoContext);
  if (!value) throw new Error('useFrameo must be used inside FrameoProvider');
  return value;
}