/**
 * Account Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { changePasswordRequest, mapAuthUserToAppUser, updateProfileRequest } from '@/services/authApi';
import { isValidEmailShape, isValidPhone, normalizeEmail, normalizePhone, validateProfileName } from '@/utils/authValidation';

export default function AccountSettingsScreen() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    if (!user) {
      Alert.alert('Sign in required', 'Log in to save your account details.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = normalizeEmail(email);
    const trimmedPhone = phone.trim() ? normalizePhone(phone) : '';
    const nameError = validateProfileName(trimmedName);

    if (nameError) {
      Alert.alert('Invalid name', nameError);
      return;
    }
    if (!isValidEmailShape(trimmedEmail)) {
      Alert.alert('Invalid email', 'Enter a real email address, like you@example.com.');
      return;
    }
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      Alert.alert('Invalid phone', 'Phone must be 10 to 15 digits.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfileRequest({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
      });
      setUser({
        ...user,
        ...mapAuthUserToAppUser(updated),
      });
      Alert.alert('Saved', 'Your account details have been updated.');
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.email?.[0] ||
        e?.response?.data?.errors?.name?.[0] ||
        e?.response?.data?.errors?.phone?.[0] ||
        e?.response?.data?.message ||
        'Could not save your changes. Try again.';
      Alert.alert('Save failed', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;
    if (!currentPassword.trim()) {
      Alert.alert('Current password', 'Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('New password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Confirm password', 'New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePasswordRequest({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSectionOpen(false);
      Alert.alert('Password updated', 'You can sign in with your new password next time.');
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.current_password?.[0] ||
        e?.response?.data?.errors?.password?.[0] ||
        e?.response?.data?.message ||
        'Could not update password.';
      Alert.alert('Update failed', String(msg));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Add your display name"
                placeholderTextColor={Colors.text.secondary}
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.text.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.text.secondary}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setPasswordSectionOpen((open) => !open)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Change password</Text>
              <Text style={styles.collapseHint}>Collapsed by default — tap to expand</Text>
            </View>
            <MaterialCommunityIcons
              name={passwordSectionOpen ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={Colors.text.secondary}
            />
          </TouchableOpacity>

          {passwordSectionOpen ? (
            <View style={styles.passwordBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current password</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    placeholder="Current password"
                    placeholderTextColor={Colors.text.secondary}
                    editable={!changingPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword((v) => !v)}>
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New password</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-plus-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.text.secondary}
                    editable={!changingPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword((v) => !v)}>
                    <MaterialCommunityIcons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm new password</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-check-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Repeat new password"
                    placeholderTextColor={Colors.text.secondary}
                    editable={!changingPassword}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, changingPassword && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color={Colors.primary.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <View style={styles.saveButtonContent}>
              <ActivityIndicator color={Colors.primary.white} size="small" />
              <Text style={styles.saveButtonText}>Saving…</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.primary.deepBlue,
    marginBottom: Spacing.xs,
  },
  sectionTitleSpaced: {
    marginBottom: Spacing.lg,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapseHint: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  passwordBody: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary.lightGray,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary.grayLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary.lightGray,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButtonText: {
    ...Typography.body,
    color: Colors.primary.white,
    fontWeight: '600',
  },
});

