import { Alert, Linking, Platform, View } from 'react-native';
import React from 'react';

import { buildSmsUrl, buildWhatsAppUrl } from '../../services/shareLinks';
import { makeStyles, spacing } from '../../theme';
import { ListRow, RowDivider, Sheet } from '../ui';

/**
 * Where "Share" on a receipt actually goes, instead of the OS's generic share
 * sheet handing the choice — and the recipient — entirely to the user.
 *
 * WhatsApp and Message go straight to *this* person, pre-filled, because
 * that is who a receipt is ever for. Everything else — the PDF, email, any
 * other app — stays one tap away as "More options", which is the existing
 * generic share this replaces nothing about.
 */
export function ShareOptionsSheet({
  visible,
  onClose,
  personName,
  phone,
  countryCode,
  text,
  onMore,
}: {
  visible: boolean;
  onClose: () => void;
  /** Falls back to a neutral word — not every entry has a name attached. */
  personName?: string;
  phone?: string;
  countryCode?: string;
  /** The receipt as plain text — the only thing either deep link can carry. */
  text: string;
  /** The existing generic share (PDF on native, text on web). */
  onMore: () => void;
}) {
  const styles = useStyles();
  const name = personName || 'them';
  const hasPhone = !!phone;

  const whatsAppUrl = buildWhatsAppUrl({ phone, countryCode }, text);
  const smsUrl = buildSmsUrl({ phone, countryCode }, text, Platform.OS);

  /** Closes the sheet before switching apps, the same beat AddActionsButton
   * uses — so the sheet is not still animating away when WhatsApp opens. */
  const open = (url: string | undefined) => {
    if (!url) return;
    onClose();
    setTimeout(async () => {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Not available', 'This could not be opened on this device.');
    }, 180);
  };

  const more = () => {
    onClose();
    setTimeout(onMore, 180);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Share receipt">
      <View style={styles.sheet}>
        <ListRow
          icon="logo-whatsapp"
          iconTint="#25D366"
          title="WhatsApp"
          subtitle={hasPhone ? `Opens ${name}'s chat directly` : 'No phone number saved'}
          showChevron={hasPhone}
          onPress={hasPhone ? () => open(whatsAppUrl) : undefined}
          style={hasPhone ? undefined : styles.disabled}
        />
        <RowDivider />
        <ListRow
          icon="chatbubble-outline"
          title="Message"
          subtitle={
            hasPhone
              ? `${countryCode ?? '+91'} ${phone} filled in automatically`
              : 'No phone number saved'
          }
          showChevron={hasPhone}
          onPress={hasPhone ? () => open(smsUrl) : undefined}
          style={hasPhone ? undefined : styles.disabled}
        />
        <RowDivider />
        <ListRow
          icon="ellipsis-horizontal"
          title="More options"
          subtitle="PDF, email and everything else"
          onPress={more}
        />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles(() => ({
  sheet: {
    // Cancels the sheet's own padding so the rows run edge to edge, matching
    // AddActionsButton's own sheet.
    marginHorizontal: -spacing.lg,
  },
  disabled: {
    opacity: 0.45,
  },
}));
