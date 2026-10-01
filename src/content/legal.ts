/**
 * The Privacy Policy and the Terms & Conditions, as structured data.
 *
 * Written in plain language rather than legalese: this is read on a phone, at
 * arm's length, mostly by people who are standing at a function and have ten
 * seconds for it. Every section says what the app actually does, not what a
 * template thinks the app does.
 *
 * These documents cover user-facing promises and should be reviewed by a
 * lawyer familiar with Indian consumer-app law (DPDP Act 2023 in particular)
 * before being relied on in a dispute. The `lastUpdated` date is what the
 * reader sees at the top of each screen; bump it when the text changes
 * materially — small wording fixes do not count.
 */

/** One sub-item within a legal section — a paragraph of text, or a bullet list. */
export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: readonly string[] };

export interface LegalSection {
  heading: string;
  body: readonly LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** Human-readable date shown under the title, e.g. "1 October 2026". */
  lastUpdated: string;
  /** One short paragraph that sits at the top, below the date. */
  intro: string;
  sections: readonly LegalSection[];
}

const CONTACT_EMAIL = 'karthick.cinraj@zohocorp.com';
const LAST_UPDATED = '1 October 2026';

export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: LAST_UPDATED,
  intro:
    'Moi Manager keeps your family’s moi book. This policy says what we collect, where it is stored, what we use it for, and the choices you have. Short version: nothing you record leaves your account — we do not sell it, share it with advertisers, or use it to build a profile of you.',
  sections: [
    {
      heading: 'What we collect',
      body: [
        {
          type: 'paragraph',
          text: 'There are three ways data about you reaches the app.',
        },
        {
          type: 'list',
          items: [
            'From Google when you sign in: your name, email address and the URL of your profile photo. We use these to identify your account and to show your profile inside the app. We do not read your Gmail, your contacts, or any other Google data.',
            'From you during onboarding: your mobile number and country code. This is how your book is matched to you if you reinstall the app or switch devices.',
            'From you while you use the app: the records you create — people (name, phone, village, photo), functions (title, date, type, location, photos), moi entries (amount, person, function, payment type, date, note), gifts (item, estimated value, person, function) and expenses.',
          ],
        },
        {
          type: 'paragraph',
          text:
            'The services we use to run the app also keep standard hosting logs (approximate IP address, device/browser string, times of requests). We do not add analytics, advertising SDKs, or third-party trackers of our own.',
        },
      ],
    },
    {
      heading: 'Where it is stored',
      body: [
        {
          type: 'list',
          items: [
            'Firebase Authentication (operated by Google) holds your sign-in credentials.',
            'Turso holds your records, in a database row-scoped to your user id — your account is the only one that can read your rows.',
            'Vercel hosts the web app you load from your browser or installed PWA.',
            'Your device keeps a copy of your most recent records in local storage so the app opens quickly and still works when you are offline. Offline mode is read-only: new entries need the app to be online.',
          ],
        },
      ],
    },
    {
      heading: 'What we use it for',
      body: [
        {
          type: 'list',
          items: [
            'To run the app for you — show your books, save what you write, generate the receipts you ask for.',
            'To match your book to you across devices by phone number.',
            'To diagnose faults when something goes wrong, using the hosting logs described above.',
          ],
        },
        {
          type: 'paragraph',
          text:
            'That is the whole list. We do not sell your data. We do not share it with advertisers. We do not use it to build a profile of you.',
        },
      ],
    },
    {
      heading: 'Who else sees it',
      body: [
        {
          type: 'paragraph',
          text:
            'By default, nobody. The only account that can read your records is yours.',
        },
        {
          type: 'paragraph',
          text:
            'The providers we use to run the app (Google / Firebase for sign-in, Turso for the database, Vercel for hosting) hold the data on their systems to serve your requests. Their own privacy policies apply to that storage, and we have chosen providers that treat the data as the customer’s.',
        },
        {
          type: 'paragraph',
          text:
            'If you share a receipt via WhatsApp or SMS, the message is composed on your device and handed to WhatsApp or your messaging app directly. We do not route it through any server of our own; it is covered by those apps’ own privacy policies from the moment you send it.',
        },
      ],
    },
    {
      heading: 'Your choices and your rights',
      body: [
        {
          type: 'list',
          items: [
            'See it: everything the app shows you is your copy.',
            'Correct it: edit any entry, person, function, gift or expense from inside the app.',
            'Delete it: delete individual records at any time. To delete your whole account and every record attached to it, write to the address below and we will do it within 30 days.',
            'Take it with you: use Backup & Restore in More to save a copy of your data.',
          ],
        },
        {
          type: 'paragraph',
          text:
            'We honour the privacy rights that apply where you live, including those under India’s Digital Personal Data Protection Act 2023.',
        },
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        {
          type: 'paragraph',
          text:
            'We keep your records for as long as your account exists. When you delete your account we delete your records within 30 days, except where we are required by law to keep something for longer (for example, tax or anti-fraud records of a payment, if we add paid features in the future).',
        },
      ],
    },
    {
      heading: 'Children',
      body: [
        {
          type: 'paragraph',
          text:
            'Moi Manager is not aimed at children under 13 and we do not knowingly collect data from them. If you believe a child has created an account, write to us and we will delete it.',
        },
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        {
          type: 'paragraph',
          text:
            'If we change this policy we will update the date at the top. For changes that affect how we use your data, we will show you a notice when you next open the app so you can read them before continuing.',
        },
      ],
    },
    {
      heading: 'Contact',
      body: [
        {
          type: 'paragraph',
          text: `Write to ${CONTACT_EMAIL} for any question about this policy or any request about your data.`,
        },
      ],
    },
  ],
};

export const termsAndConditions: LegalDocument = {
  title: 'Terms & Conditions',
  lastUpdated: LAST_UPDATED,
  intro:
    'These terms govern your use of Moi Manager (the app). By signing in or using the app you agree to them. If you do not agree, do not use the app.',
  sections: [
    {
      heading: 'What the app is',
      body: [
        {
          type: 'paragraph',
          text:
            'Moi Manager is a personal tool for recording moi, gifts, and expenses from family functions. It keeps your records between you, the device you use, and the services that run the app on your behalf. It is not a payment app, a banking app, or an accounting system — it is a book you keep.',
        },
      ],
    },
    {
      heading: 'Who can use it',
      body: [
        {
          type: 'list',
          items: [
            'You must be at least 13 years old.',
            'You need a Google account to sign in.',
            'You will give us a working mobile number during onboarding, and you are responsible for keeping it current — it is how your book is matched to you across devices.',
            'One account per person, please.',
          ],
        },
      ],
    },
    {
      heading: 'Your account',
      body: [
        {
          type: 'paragraph',
          text:
            'Keep your Google credentials safe. Anything done through your account is treated as done by you. If you share your device with someone else while you are signed in, you are responsible for what they do.',
        },
        {
          type: 'paragraph',
          text:
            'If you suspect your account is compromised, sign out, change your Google password, and write to us so we can help you take back control.',
        },
      ],
    },
    {
      heading: 'Your data is yours',
      body: [
        {
          type: 'list',
          items: [
            'You own the records you enter. We hold them for you.',
            'You can edit or delete any record from inside the app at any time.',
            'You can ask us to delete your whole account and every record attached to it by writing to the contact address below. See the Privacy Policy for how that works.',
          ],
        },
      ],
    },
    {
      heading: 'Acceptable use',
      body: [
        {
          type: 'list',
          items: [
            'Do not use the app to break the law, defraud anyone, or harass anyone.',
            'Do not store a person’s mobile number, photo, or other personal details in the app without their permission.',
            'Do not attempt to reach other users’ data, interfere with the service, or probe for vulnerabilities. If you find a security issue by accident, please report it — do not exploit it.',
          ],
        },
      ],
    },
    {
      heading: 'Service availability',
      body: [
        {
          type: 'paragraph',
          text:
            'The app is provided as-is. We work hard to keep it running, but we do not promise uninterrupted access. It may be unavailable during maintenance, during hosting outages, or because of events outside our control. When the network is down, the app runs in read-only mode on the records already saved to your device.',
        },
      ],
    },
    {
      heading: 'Changes to the app',
      body: [
        {
          type: 'paragraph',
          text:
            'We may add, change, or remove features at any time. We will not change how your data is used in a way that is less favourable to you without telling you first.',
        },
      ],
    },
    {
      heading: 'Price',
      body: [
        {
          type: 'paragraph',
          text:
            'The app is free to use today. If we introduce a paid feature in the future we will tell you clearly in the app before you are charged for anything.',
        },
      ],
    },
    {
      heading: 'Ending use',
      body: [
        {
          type: 'list',
          items: [
            'You can stop using the app at any time by signing out and removing it from your device.',
            'We may suspend or close an account that we reasonably believe is being used to break these terms or the law.',
          ],
        },
      ],
    },
    {
      heading: 'Limitation of liability',
      body: [
        {
          type: 'paragraph',
          text:
            'To the maximum extent allowed by law, we are not liable for indirect, incidental, special or consequential losses arising from your use of the app, including loss of data, loss of profit, or any claim between you and the people whose records you keep in the app. The app is a personal record — please use Backup & Restore to keep a copy of anything important.',
        },
      ],
    },
    {
      heading: 'Governing law',
      body: [
        {
          type: 'paragraph',
          text:
            'These terms are governed by the laws of India. Any dispute will be subject to the exclusive jurisdiction of the courts of Tamil Nadu.',
        },
      ],
    },
    {
      heading: 'Contact',
      body: [
        {
          type: 'paragraph',
          text: `Write to ${CONTACT_EMAIL} with any question about these terms.`,
        },
      ],
    },
  ],
};
