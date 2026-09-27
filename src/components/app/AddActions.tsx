import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View } from 'react-native';

import { makeStyles, spacing, useColors } from '../../theme';
import { Button } from '../ui/Button';
import { ListRow, RowDivider } from '../ui/ListRow';
import { Sheet } from '../ui/Sheet';

export interface AddAction {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Defaults to the brand colour. */
  tint?: string;
  onPress: () => void;
}

/**
 * One Add button that asks what, rather than a button per thing.
 *
 * A function can take moi, a gift or an expense, and a person four different
 * records — laying those out as buttons puts three or four competing actions
 * on every screen and still leaves each of them narrow. One button and a sheet
 * keeps the page quiet and the choices readable, and it is the same gesture
 * as the tab bar's own + button.
 */
export function AddActionsButton({
  label = 'Add',
  title = 'Add new',
  actions,
}: {
  label?: string;
  title?: string;
  actions: AddAction[];
}) {
  const styles = useStyles();
  const colors = useColors();
  const [open, setOpen] = useState(false);

  /** Lets the sheet close before the next screen slides in. */
  const run = (action: AddAction) => {
    setOpen(false);
    setTimeout(action.onPress, 180);
  };

  return (
    <>
      <Button label={label} icon="add" size="lg" block onPress={() => setOpen(true)} />

      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        <View style={styles.sheet}>
          {actions.map((action, index) => (
            <React.Fragment key={action.title}>
              {index > 0 ? <RowDivider /> : null}
              <ListRow
                icon={action.icon}
                iconTint={action.tint ?? colors.primary}
                title={action.title}
                subtitle={action.subtitle}
                showChevron={false}
                onPress={() => run(action)}
              />
            </React.Fragment>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const useStyles = makeStyles(() => ({
  sheet: {
    // Cancels the sheet's own padding so the rows run edge to edge, the way
    // they do in the tab bar's add sheet.
    marginHorizontal: -spacing.lg,
  },
}));
