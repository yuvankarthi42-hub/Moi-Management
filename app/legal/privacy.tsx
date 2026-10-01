import React from 'react';

import { LegalScreen } from '../../src/components/app/LegalDocument';
import { privacyPolicy } from '../../src/content/legal';

export default function PrivacyPolicyScreen() {
  return <LegalScreen doc={privacyPolicy} />;
}
