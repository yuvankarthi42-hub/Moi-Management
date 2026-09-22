import React from 'react';

import { GroupReportBody } from '../../src/components/app/GroupReportBody';
import { ReportShell } from '../../src/components/app/ReportShell';
import { buildFamilyReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';

export default function FamilyReportScreen() {
  const { data } = useAppData();

  return (
    <ReportShell title="Family Report" subtitle="Family wise collection summary" kind="family" data={data}>
      {(range) => (
        <GroupReportBody
          rows={buildFamilyReport(data, range)}
          emptyTitle="No families to show"
          emptyMessage="Group your people into families to see this summary."
          unitSingular="family"
          unitPlural="families"
        />
      )}
    </ReportShell>
  );
}
