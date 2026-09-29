import type { UserScope } from '../data/turso/TursoDataSource';

/**
 * Who the data layer is currently working for.
 *
 * A tiny mutable cell rather than a prop threaded through the app: the data
 * source is built once at module load, while the account only becomes known
 * after Firebase restores a session. The auth layer writes here, the data
 * layer reads. Keeping it in its own module is also what stops the two from
 * importing each other.
 */

let userId: string | undefined;

export function setCurrentUserId(id: string | undefined): void {
  userId = id;
}

export function getCurrentUserId(): string | undefined {
  return userId;
}

export const userScope: UserScope = {
  currentUserId: () => userId,
  /**
   * Throws rather than returning undefined. A query with no user behind it
   * would either fail on a NOT NULL column or, worse, match every row — so it
   * must never be built in the first place.
   */
  requireUserId: () => {
    if (!userId) throw new Error('No signed-in user: nothing can be read or written.');
    return userId;
  },
};
