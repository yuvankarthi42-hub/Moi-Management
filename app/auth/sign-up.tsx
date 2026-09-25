import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { PhoneField } from '../../src/components/app/PhoneField';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, Screen, T, useToast,
} from '../../src/components/ui';
import { AuthError, DEFAULT_COUNTRY, useAuth } from '../../src/auth';
import { makeStyles, spacing, useColors } from '../../src/theme';

/** Creates the account this phone's moi book belongs to. */
export default function SignUpScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { signUp } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.code);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErrors({});
    setSaving(true);
    try {
      await signUp({ name, countryCode, phone, pin });
      showToast({ message: `Welcome, ${name.trim()}` });
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof AuthError) setErrors({ [error.field ?? 'phone']: error.message });
      else setErrors({ phone: 'Could not create the account. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader title="Create account" showBack onBack={() => router.back()} />

      <KeyboardForm>
        <T variant="body" tone="secondary" style={styles.intro}>
          Your mobile number is how you sign back in, so pick the country code
          that matches it.
        </T>

        <Field
          label="Your name"
          required
          value={name}
          onChangeText={setName}
          placeholder="Karthick"
          autoCapitalize="words"
          error={errors.name}
        />

        <PhoneField
          countryCode={countryCode}
          onChangeCountryCode={setCountryCode}
          phone={phone}
          onChangePhone={setPhone}
          error={errors.phone}
        />

        <Field
          label="Create a 4-digit PIN"
          required
          value={pin}
          onChangeText={(value) => setPin(value.replace(/[^0-9]/g, ''))}
          placeholder="••••"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          leftIcon="lock-closed-outline"
          error={errors.pin}
          hint="You will type this every time you sign in."
        />

        <View style={styles.note}>
          <T variant="caption" tone="muted">
            Accounts are stored on this device only — there is no server behind
            this yet, and nothing leaves your phone.
          </T>
        </View>
      </KeyboardForm>

      <DockedFooter>
        <Button label="Create account" size="lg" block loading={saving} onPress={submit} />
      </DockedFooter>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  intro: {
    marginBottom: spacing.xl,
  },
  note: {
    marginTop: spacing.md,
  },
}));
