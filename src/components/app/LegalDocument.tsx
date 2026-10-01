import React from 'react';
import { Linking, View } from 'react-native';

import type { LegalBlock, LegalDocument } from '../../content/legal';
import { AppHeader, Screen, ScreenScroll, T } from '../ui';
import { makeStyles, spacing } from '../../theme';

/**
 * Renders a structured legal document — Privacy Policy, Terms, anything else
 * that is section headings and paragraphs — against the app's own typography
 * and spacing, so it reads as part of the app rather than as a pasted PDF.
 *
 * Email addresses in paragraph text are made tappable without changing the
 * data shape: a plain-text policy stays plain-text, and the renderer handles
 * the one piece of interactivity the reader actually needs.
 */
export function LegalScreen({ doc }: { doc: LegalDocument }) {
  const styles = useStyles();

  return (
    <Screen>
      <AppHeader title={doc.title} />
      <ScreenScroll>
        <View style={styles.container}>
          <T variant="caption" tone="muted">
            {`Last updated · ${doc.lastUpdated}`}
          </T>
          <T variant="body" style={styles.intro}>
            {doc.intro}
          </T>

          {doc.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <T variant="h3" style={styles.heading}>
                {section.heading}
              </T>
              {section.body.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </View>
          ))}
        </View>
      </ScreenScroll>
    </Screen>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const styles = useStyles();

  if (block.type === 'paragraph') {
    return (
      <T variant="body" style={styles.paragraph}>
        {renderWithLinks(block.text)}
      </T>
    );
  }

  return (
    <View style={styles.list}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.listItem}>
          <T variant="body" style={styles.bullet}>
            {'•'}
          </T>
          <T variant="body" style={styles.listText}>
            {renderWithLinks(item)}
          </T>
        </View>
      ))}
    </View>
  );
}

/**
 * Splits text around email addresses so each one renders as a tappable
 * `mailto:` link. Keeps the surrounding punctuation untouched.
 */
function renderWithLinks(text: string): React.ReactNode {
  const EMAIL_RE = /([\w.+-]+@[\w-]+\.[\w.-]+)/g;
  const parts = text.split(EMAIL_RE);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <T
          key={i}
          variant="body"
          tone="primary"
          onPress={() => Linking.openURL(`mailto:${part}`)}
        >
          {part}
        </T>
      );
    }
    return part;
  });
}

const useStyles = makeStyles(() => ({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  intro: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
  },
  heading: {
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  bullet: {
    width: spacing.lg,
  },
  listText: {
    flex: 1,
  },
}));
