import type { Guest, ID, RsvpStatus } from '../../domain/models';
import type { DataSource, NewGuest } from '../DataSource';
import { NotFoundError, ValidationError } from './errors';
import { normalisePhone } from './PeopleRepository';

/** Per-function guest lists, RSVP and check-in (spec §11). */
export class GuestRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<Guest[]> {
    return this.source.listGuests();
  }

  async listForFunction(functionId: ID): Promise<Guest[]> {
    const all = await this.source.listGuests();
    return all
      .filter((g) => g.functionId === functionId)
      .sort((a, b) => a.guestName.localeCompare(b.guestName));
  }

  async create(input: NewGuest): Promise<Guest> {
    const clean = this.validate(input);
    // The same person invited twice to one function is a data-entry slip.
    if (clean.personId) {
      const existing = await this.source.listGuests();
      const duplicate = existing.find(
        (g) => g.functionId === clean.functionId && g.personId === clean.personId,
      );
      if (duplicate) {
        throw new ValidationError(
          `${duplicate.guestName} is already on this guest list.`,
          'personId',
        );
      }
    }
    return this.source.createGuest(clean);
  }

  async update(id: ID, patch: Partial<NewGuest>): Promise<Guest> {
    const all = await this.source.listGuests();
    const current = all.find((g) => g.id === id);
    if (!current) throw new NotFoundError('That guest');
    return this.source.updateGuest(id, this.validate({ ...current, ...patch }));
  }

  remove(id: ID): Promise<void> {
    return this.source.deleteGuest(id);
  }

  setRsvp(id: ID, rsvpStatus: RsvpStatus): Promise<Guest> {
    return this.source.updateGuest(id, { rsvpStatus });
  }

  /**
   * Marks attendance. Checking someone in also settles their RSVP — they are
   * demonstrably here, so leaving it "Pending" would misreport the totals.
   */
  setCheckedIn(id: ID, checkedIn: boolean): Promise<Guest> {
    return this.source.updateGuest(
      id,
      checkedIn ? { checkedIn: true, rsvpStatus: 'accepted' } : { checkedIn: false },
    );
  }

  /** Adds several guests at once, skipping any that fail validation. */
  async bulkCreate(inputs: NewGuest[]): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;
    for (const input of inputs) {
      try {
        await this.create(input);
        added += 1;
      } catch {
        skipped += 1;
      }
    }
    return { added, skipped };
  }

  private validate(input: NewGuest): NewGuest {
    if (!input.functionId) throw new ValidationError('Choose a function.', 'functionId');
    const guestName = input.guestName?.trim();
    if (!guestName) throw new ValidationError('Enter the guest’s name.', 'guestName');

    const guestCount = Math.round(input.guestCount ?? 1);
    if (!Number.isFinite(guestCount) || guestCount < 1) {
      throw new ValidationError('Number of people must be at least 1.', 'guestCount');
    }

    return {
      ...input,
      guestName,
      guestCount,
      phone: input.phone ? normalisePhone(input.phone) : undefined,
      relationship: input.relationship?.trim() || undefined,
      groupName: input.groupName?.trim() || undefined,
      village: input.village?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
  }
}
