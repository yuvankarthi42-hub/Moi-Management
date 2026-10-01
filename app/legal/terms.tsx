import React from 'react';

import { LegalScreen } from '../../src/components/app/LegalDocument';
import { termsAndConditions } from '../../src/content/legal';

export default function TermsScreen() {
  return <LegalScreen doc={termsAndConditions} />;
}
