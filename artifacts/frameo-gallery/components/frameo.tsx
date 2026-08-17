import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function PressableScale({ children, onPress, style, disabled, testID }: { children: React.ReactNode; onPress?: () => void; style?: any; disabled?: boolean; testID?: string }) {
  const colors = useColors();
  return <Pressable testID={testID} disabled={disabled} onPress={onPress} style={({ pressed }) => [style, { opacity: disabled ? 0.45 : pressed ? 0.68 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, { borderRadius: colors.radius }]}>{children}</Pressable>;
}

export function IconButton({ icon, label, onPress, testID, disabled, destructive }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; testID?: string; disabled?: boolean; destructive?: boolean }) {
  const colors = useColors();
  return <PressableScale testID={testID} disabled={disabled} onPress={onPress} style={[styles.iconButton, { backgroundColor: destructive ? colors.destructive : colors.card, borderColor: destructive ? colors.destructive : colors.border }]}>
    <Feather name={icon} size={19} color={destructive ? colors.destructiveForeground : colors.foreground} />
    <Text style={[styles.iconButtonText, { color: destructive ? colors.destructiveForeground : colors.foreground }]}>{label}</Text>
  </PressableScale>;
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, testID }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: 'default' | 'url' | 'numeric'; multiline?: boolean; testID?: string }) {
  const colors = useColors();
  return <View style={styles.field}>
    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
    <TextInput testID={testID} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} autoCapitalize="none" style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }, multiline && styles.multiline]} />
  </View>;
}

export function SectionHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  const colors = useColors();
  return <View style={styles.sectionHeader}><Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>{detail ? <Text style={[styles.sectionDetail, { color: colors.mutedForeground }]}>{detail}</Text> : null}</View>;
}

export function StatusLine({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  const colors = useColors();
  return <View style={[styles.statusLine, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.statusDot, { backgroundColor: ok ? colors.primary : colors.destructive }]} /><View style={styles.statusCopy}><Text style={[styles.statusLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.statusDetail, { color: colors.mutedForeground }]}>{detail}</Text></View></View>;
}

export function LoadingBlock({ label = 'Checking the connection' }: { label?: string }) {
  const colors = useColors();
  return <View style={styles.loadingBlock}><ActivityIndicator color={colors.primary} /><Text style={[styles.statusDetail, { color: colors.mutedForeground }]}>{label}</Text></View>;
}

export function EmptyBlock({ icon, title, detail }: { icon: keyof typeof Feather.glyphMap; title: string; detail: string }) {
  const colors = useColors();
  return <View style={[styles.emptyBlock, { borderColor: colors.border, backgroundColor: colors.card }]}><Feather name={icon} size={26} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.emptyDetail, { color: colors.mutedForeground }]}>{detail}</Text></View>;
}

export const styles = StyleSheet.create({
  iconButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 15, borderWidth: 1 },
  iconButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  field: { gap: 7, marginBottom: 14 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.3 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
  multiline: { minHeight: 90, paddingTop: 13, textAlignVertical: 'top' },
  sectionHeader: { marginBottom: 17, gap: 4 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  sectionDetail: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, maxWidth: 600 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, padding: 12, borderRadius: 14 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusCopy: { flex: 1, gap: 2 },
  statusLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  statusDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  loadingBlock: { minHeight: 84, justifyContent: 'center', alignItems: 'center', gap: 9 },
  emptyBlock: { alignItems: 'center', gap: 9, padding: 22, borderWidth: 1, borderRadius: 18 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  emptyDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 420 },
});