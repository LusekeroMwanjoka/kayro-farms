import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[s.wrap, compact && s.compact]} accessibilityRole="image" accessibilityLabel="Kayro Farms logo">
      <Image source={require('../../assets/images/kayro-farms-mark.png')} style={[s.mark, compact && s.compactMark]} resizeMode="contain" />
      <View style={s.wordmark}>
        <Text style={[s.name, compact && s.compactName]}>Kayro</Text>
        <Text style={[s.descriptor, compact && s.compactDescriptor]}>F A R M S</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.white },
  compactMark: { width: 40, height: 40, borderRadius: 14 },
  wordmark: { alignItems: 'center' },
  name: { color: colors.forest, fontSize: 28, fontWeight: '800', letterSpacing: -0.9 },
  compactName: { fontSize: 19 },
  descriptor: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2.1, marginTop: 1 },
  compactDescriptor: { fontSize: 8, letterSpacing: 1.7 },
});
