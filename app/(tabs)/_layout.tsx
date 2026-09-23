import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DataGate } from '../../src/components/app/DataGate';
import { TabBar } from '../../src/components/app/TabBar';
import { ListRow, RowDivider, Sheet } from '../../src/components/ui';
import { colors, makeStyles, useColors } from '../../src/theme';

/**
 * The four main tabs plus the raised centre action.
 *
 * The "+" doesn't jump straight to one form — recording a moi, adding a
 * function and adding a person are all common enough that a short chooser is
 * faster than guessing wrong.
 */
export default function TabsLayout() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const go = (path: string) => {
    setAddOpen(false);
    // Let the sheet's dismiss animation start before pushing the next screen,
    // otherwise Android shows both at once for a frame.
    setTimeout(() => router.push(path as never), 120);
  };

  return (
    <DataGate>
      <View style={styles.root}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.background },
          }}
          tabBar={(props) => <TabBar {...props} onCentrePress={() => setAddOpen(true)} />}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="functions" options={{ title: 'Functions' }} />
          <Tabs.Screen name="people" options={{ title: 'People' }} />
          <Tabs.Screen name="more" options={{ title: 'More' }} />
        </Tabs>

        <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add new">
          <ListRow
            icon="cash-outline"
            title="Add Moi"
            subtitle="Record a gift at a function"
            onPress={() => go('/moi/add')}
          />
          <RowDivider />
          <ListRow
            icon="arrow-up-circle-outline"
            title="Record Moi Given"
            subtitle="Moi you gave back to someone"
            onPress={() => go('/moi/given')}
          />
          <RowDivider />
          <ListRow
            icon="calendar-outline"
            title="Add Function"
            subtitle="Wedding, ear piercing, house warming…"
            onPress={() => go('/function/new')}
          />
          <RowDivider />
          <ListRow
            icon="receipt-outline"
            title="Add Expense"
            subtitle="Record what a function cost"
            onPress={() => go('/expense/new')}
          />
          <RowDivider />
          <ListRow
            icon="person-add-outline"
            title="Add Person"
            subtitle="Save a guest to your contact book"
            onPress={() => go('/person/new')}
          />
        </Sheet>
      </View>
    </DataGate>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
