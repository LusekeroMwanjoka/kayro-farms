import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/ui';
import { colors, radius, space } from '../theme';

export default function Login() {
  const { profile, signIn, signingIn, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (profile) return <Redirect href="/" />;

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
        <Text style={s.brand}>Kayro Farms</Text>
        <Text style={s.sub}>Sign in to continue</Text>
        <View style={{ height: space.lg }} />
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button
          title="Sign in"
          loading={signingIn}
          disabled={!email.trim() || !password}
          onPress={() => signIn(email, password)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  wrap: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md },
  brand: { fontSize: 34, fontWeight: '800', color: colors.forest },
  sub: { fontSize: 16, color: colors.muted },
  input: {
    minHeight: 52,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.charcoal,
  },
  error: { color: colors.alert, fontSize: 14 },
});
