import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { DateField } from '../../src/components/app/DateField';
import { OptionPicker } from '../../src/components/app/OptionPicker';
import { AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, Segmented, T, useToast } from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { EXPENSE_CATEGORIES, expenseCategoryMeta } from '../../src/domain/categories';
import { PAYMENT_TYPES, functionTypeMeta } from '../../src/domain/functionTypes';
import type { ExpenseCategory, ID, ISODate, PaymentType } from '../../src/domain/models';
import { selectFunctions } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, spacing } from '../../src/theme';
import { formatDate, toISODate } from '../../src/utils/date';
import { formatMoney } from '../../src/utils/format';

/**
 * Adds or edits one function expense.
 *
 * There is no budget field anywhere: the product rule is that expenses are
 * recorded against a function, never planned against a monthly budget (spec §14).
 */
export default function ExpenseFormScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; functionId?: string }>();
  const { data, addExpense, editExpense, removeExpense } = useAppData();
  const { showToast } = useToast();

  const functions = useMemo(() => selectFunctions(data), [data]);
  const existing = useMemo(
    () => data.expenses.find((e) => e.id === params.id),
    [data.expenses, params.id],
  );

  const defaultFunctionId = params.functionId ?? functions[0]?.id;

  const [functionId, setFunctionId] = useState<ID | undefined>(defaultFunctionId);
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState<ISODate>(toISODate(new Date()));
  const [notes, setNotes] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | undefined>();

  const [functionOpen, setFunctionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Adopt the default once the dataset resolves (see the same note in Add Moi).
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (defaultApplied.current || functionId || !defaultFunctionId) return;
    defaultApplied.current = true;
    setFunctionId(defaultFunctionId);
  }, [defaultFunctionId, functionId]);

  useEffect(() => {
    if (!existing) return;
    setFunctionId(existing.functionId);
    setCategory(existing.category);
    setAmount(String(existing.amount));
    setPaymentType(existing.paymentType);
    setPaidBy(existing.paidBy ?? '');
    setDate(existing.date);
    setNotes(existing.notes ?? '');
    setReceiptPhoto(existing.receiptPhoto);
  }, [existing]);

  const numericAmount = Number(amount.replace(/[^\d]/g, ''));
  const fn = functions.find((f) => f.id === functionId);

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) setReceiptPhoto(result.assets[0].uri);
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!functionId) next.functionId = 'Choose which function this is for.';
    if (!numericAmount) next.amount = 'Enter the amount.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const payload = {
      functionId: functionId!,
      category,
      amount: numericAmount,
      paymentType,
      paidBy: paidBy || undefined,
      date,
      notes: notes || undefined,
      receiptPhoto,
    };

    try {
      if (existing) {
        await editExpense(existing.id, payload);
        showToast({ message: 'Expense updated' });
      } else {
        await addExpense(payload);
        showToast({ message: `${formatMoney(numericAmount)} expense saved` });
      }
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field ?? 'amount']: error.message });
      } else {
        Alert.alert('Could not save', 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const snapshot = existing;
          await removeExpense(existing.id);
          showToast({
            message: 'Expense deleted',
            variant: 'destructive',
            action: {
              label: 'Undo',
              onPress: () => {
                const { id, createdAt, ...rest } = snapshot;
                void addExpense(rest);
              },
            },
          });
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader
        title={existing ? 'Edit Expense' : 'Add Expense'}
        showBack
        onBack={() => router.back()}
        actions={
          existing
            ? [{ icon: 'trash-outline', onPress: confirmDelete, accessibilityLabel: 'Delete expense' }]
            : undefined
        }
      />

      <KeyboardForm>
        <PickerField
          label="Function"
          required
          value={fn ? `${fn.title} · ${formatDate(fn.date)}` : undefined}
          placeholder="Choose function"
          leftIcon="calendar-outline"
          onPress={() => setFunctionOpen(true)}
          error={errors.functionId}
        />

        <PickerField
          label="Category"
          required
          value={`${expenseCategoryMeta(category).emoji}  ${expenseCategoryMeta(category).label}`}
          placeholder="Choose category"
          onPress={() => setCategoryOpen(true)}
        />

        <Field
          label="Amount"
          required
          prefix="₹"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          error={errors.amount}
          style={styles.amountInput}
        />

        <T variant="smallStrong" tone="secondary" style={styles.label}>
          Payment type
        </T>
        <Segmented<PaymentType>
          options={PAYMENT_TYPES.map((p) => ({ value: p.value, label: p.label }))}
          value={paymentType}
          onChange={setPaymentType}
          style={styles.segmented}
        />

        <Field
          label="Paid by (optional)"
          value={paidBy}
          onChangeText={setPaidBy}
          placeholder="Who settled this bill?"
          autoCapitalize="words"
          leftIcon="person-outline"
        />

        <DateField label="Date" required value={date} onChange={setDate} error={errors.date} />

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Catering for lunch and dinner"
          multiline
          numberOfLines={3}
          style={styles.notes}
        />

        <T variant="smallStrong" tone="secondary" style={styles.label}>
          Receipt (optional)
        </T>
        <View style={styles.photoRow}>
          <Pressable
            onPress={pickReceipt}
            accessibilityRole="button"
            accessibilityLabel="Attach a receipt photo"
            style={({ pressed }) => [styles.photoBox, pressed && styles.pressed]}
          >
            {receiptPhoto ? (
              <Image source={{ uri: receiptPhoto }} style={styles.photo} contentFit="cover" />
            ) : (
              <Ionicons name="receipt-outline" size={24} color={colors.textMuted} />
            )}
          </Pressable>
          {receiptPhoto ? (
            <Pressable onPress={() => setReceiptPhoto(undefined)} hitSlop={8}>
              <T variant="smallStrong" tone="danger">
                Remove
              </T>
            </Pressable>
          ) : (
            <T variant="caption" tone="muted" style={styles.photoHint}>
              Keep a picture of the bill for your records.
            </T>
          )}
        </View>
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={numericAmount ? `Save ${formatMoney(numericAmount)}` : 'Save Expense'}
          size="lg"
          block
          loading={saving}
          onPress={save}
        />
      </DockedFooter>

      <OptionPicker
        visible={functionOpen}
        onClose={() => setFunctionOpen(false)}
        title="Choose function"
        selected={functionId}
        options={functions.map((f) => ({
          value: f.id,
          label: f.title,
          description: `${formatDate(f.date)}${f.village ? ` · ${f.village}` : ''}`,
          emoji: functionTypeMeta(f.type).emoji,
        }))}
        onSelect={(id) => {
          setFunctionId(id);
          setFunctionOpen(false);
        }}
      />

      <OptionPicker
        visible={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="Expense category"
        selected={category}
        options={EXPENSE_CATEGORIES.map((c) => ({
          value: c.value,
          label: c.label,
          description: c.labelTa,
          emoji: c.emoji,
        }))}
        onSelect={(value) => {
          setCategory(value);
          setCategoryOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { marginBottom: spacing.sm },
  amountInput: { fontSize: 20, fontWeight: '700' },
  segmented: { marginBottom: spacing.lg },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoHint: { flex: 1 },
  pressed: { opacity: 0.75 },
}));
