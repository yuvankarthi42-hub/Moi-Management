import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppHeader, Avatar, Button, DockedFooter, Field, KeyboardForm, Screen,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, spacing, useColors } from '../../src/theme';

export default function ProfileScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { data, saveProfile } = useAppData();
  const { profile } = data;

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [village, setVillage] = useState(profile.village ?? '');
  const [photoUri, setPhotoUri] = useState(profile.photoUri);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      await saveProfile({ name, phone, email, village, photoUri });
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) setErrors({ [error.field ?? 'name']: error.message });
      else Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader title="My Profile" showBack onBack={() => router.back()} />

      <KeyboardForm>
        <View style={styles.avatarBlock}>
          <Pressable
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityLabel="Choose a photo"
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Avatar name={name || 'Me'} seed={profile.id} size={88} />
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={colors.onPrimary} />
            </View>
          </Pressable>
        </View>

        <Field
          label="Your name"
          required
          value={name}
          onChangeText={setName}
          placeholder="Karthick"
          autoCapitalize="words"
          error={errors.name}
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />
        <Field
          label="Village"
          value={village}
          onChangeText={setVillage}
          placeholder="Tenkasi"
          autoCapitalize="words"
          leftIcon="location-outline"
        />
      </KeyboardForm>

      <DockedFooter>
        <Button label="Save Profile" size="lg" block loading={saving} onPress={save} />
      </DockedFooter>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
}));
