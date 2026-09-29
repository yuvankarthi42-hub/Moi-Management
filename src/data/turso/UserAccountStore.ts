import { fetchAsPersistentUri } from '../../utils/persistentPhotoUri';
import type { SqlClient } from './SqlClient';

/** What the `users` row holds about the signed-in account. */
export interface StoredAccount {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  countryCode?: string;
  phone?: string;
}

const str = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v);
  return s === '' ? undefined : s;
};

/**
 * The `users` row, which is the one piece of data the auth flow owns.
 *
 * It sits apart from `DataSource` because of a chicken and egg: every method
 * on a data source requires a signed-in user, and this is what creates that
 * user in the first place.
 *
 * `app_settings` is created in the same transaction on purpose. A missing
 * settings row does not read as the column defaults — a LEFT JOIN onto nothing
 * gives NULL — so the app would come up with no theme and no language rather
 * than with the defaults.
 */
export class UserAccountStore {
  constructor(private readonly sql: SqlClient) {}

  async find(uid: string): Promise<StoredAccount | undefined> {
    const rows = await this.sql.query({
      sql: `SELECT id, email, display_name, photo_url, phone_country, phone
              FROM users WHERE id = ?`,
      args: [uid],
    });
    const row = rows[0];
    if (!row) return undefined;
    return {
      id: String(row.id),
      email: String(row.email ?? ''),
      displayName: str(row.display_name),
      photoUrl: str(row.photo_url),
      countryCode: str(row.phone_country),
      phone: str(row.phone),
    };
  }

  /**
   * Creates the row on a first sign-in, or refreshes what Google owns on a
   * later one. The phone is never touched here — it is ours, collected once.
   *
   * The photo is the one field this deliberately does *not* just take from
   * `input` every time. Google's `photoUrl` is a live URL
   * (`lh3.googleusercontent.com/...`) that Google can rotate or let expire —
   * found sitting in `users.photo_url`, correctly saved, then failing to load
   * days later. So once a photo is stored — Google's or one someone picked on
   * the profile screen — it is kept rather than replaced with whatever Google
   * is handing back on this particular sign-in; only a person with *no* photo
   * yet adopts Google's, and even then as bytes of our own
   * (`fetchAsPersistentUri`) rather than as that same live URL.
   */
  async ensure(input: {
    uid: string;
    email: string;
    displayName?: string;
    photoUrl?: string;
  }): Promise<StoredAccount> {
    const at = new Date().toISOString();
    const existing = await this.find(input.uid);

    if (!existing) {
      const photoUrl = input.photoUrl ? await fetchAsPersistentUri(input.photoUrl) : null;
      await this.sql.transaction([
        {
          sql: `INSERT INTO users (id, email, display_name, photo_url, created_at, updated_at, last_seen_at)
                VALUES (?,?,?,?,?,?,?)`,
          args: [
            input.uid, input.email, input.displayName ?? null,
            photoUrl, at, at, at,
          ],
        },
        {
          sql: `INSERT INTO app_settings (user_id, updated_at) VALUES (?, ?)`,
          args: [input.uid, at],
        },
      ]);
      return (await this.find(input.uid))!;
    }

    const photoUrl = existing.photoUrl
      ?? (input.photoUrl ? await fetchAsPersistentUri(input.photoUrl) : null);

    await this.sql.transaction([{
      sql: `UPDATE users
               SET email = ?, display_name = ?, photo_url = ?, updated_at = ?, last_seen_at = ?
             WHERE id = ?`,
      args: [
        input.email, input.displayName ?? existing.displayName ?? null,
        photoUrl, at, at, input.uid,
      ],
    }]);
    return (await this.find(input.uid))!;
  }

  /**
   * Stores the mobile number.
   *
   * The unique index on (phone_country, phone) means two accounts cannot claim
   * one number, which is what invite-by-phone will resolve against when
   * per-function sharing arrives.
   */
  async savePhone(uid: string, countryCode: string, phone: string): Promise<StoredAccount> {
    const digits = phone.replace(/\D/g, '');
    await this.sql.transaction([{
      sql: `UPDATE users SET phone_country = ?, phone = ?, updated_at = ? WHERE id = ?`,
      args: [countryCode, digits, new Date().toISOString(), uid],
    }]);
    return (await this.find(uid))!;
  }
}
