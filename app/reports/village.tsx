import React from 'react';

import { GroupReportBody } from '../../src/components/app/GroupReportBody';
import { ReportShell } from '../../src/components/app/ReportShell';
import { buildVillageReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';

export default function VillageReportScreen() {
  const { data } = useAppData();

  return (
    <ReportShell title="Village Report" subtitle="Collections grouped by village" kind="village" data={data}>
      {(range) => (
        <GroupReportBody
          rows={buildVillageReport(data, range)}
          emptyTitle="No villages to show"
          emptyMessage="Add a village to your people so their moi can be grouped."
          unitSingular="village"
          unitPlural="villages"
        />
      )}
    </ReportShell>
  );
}
