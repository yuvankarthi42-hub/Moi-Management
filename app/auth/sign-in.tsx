import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PhoneField } from '../../src/components/app/PhoneField';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, Screen, T, useToast,
} from '../../src/components/ui';
import { AuthError, DEFAULT_COUNTRY, useAuth } from '../../src/auth';
import { makeStyles, spacing, useColors } from '../../src/theme';

/** Signs back into an account already created on this device. */
export default function SignInScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.code);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErrors({});
    setSaving(true);
    try {
      const account = await signIn({ countryCode, phone, pin });
      showToast({ message: 'Signed in' });
      router.replace('/(tabs)');
      return account;
    } catch (error) {
      if (error instanceof AuthError) setErrors({ [error.field ?? 'pin']: error.message });
      else setErrors({ pin: 'Could not sign in. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader title="Sign in" showBack onBack={() => router.back()} />

      <KeyboardForm>
        <T variant="body" tone="secondary" style={styles.intro}>
          Use the mobile number you created your account with.
        </T>

        <PhoneField
          countryCode={countryCode}
          onChangeCountryCode={setCountryCode}
          phone={phone}
          onChangePhone={setPhone}
          error={errors.phone}
        />

        <Field
          label="PIN"
          required
          value={pin}
          onChangeText={(value) => setPin(value.replace(/[^0-9]/g, ''))}
          placeholder="••••"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          leftIcon="lock-closed-outline"
          error={errors.pin}
        />

        <View style={styles.switch}>
          <T variant="small" tone="muted">
            No account on this phone yet?
          </T>
          <Pressable
            onPress={() => router.replace('/auth/sign-up')}
            accessibilityRole="button"
            hitSlop={8}
          >
            <T variant="smallStrong" tone="primary">
              Create one
            </T>
          </Pressable>
        </View>
      </KeyboardForm>

      <DockedFooter>
        <Button label="Sign in" size="lg" block loading={saving} onPress={submit} />
      </DockedFooter>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  intro: {
    marginBottom: spacing.xl,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
}));
