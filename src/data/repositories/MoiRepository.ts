import type { ID, MoiEntry } from '../../domain/models';
import type { DataSource, NewMoiEntry } from '../DataSource';
import { ValidationError } from './errors';

/** Largest single entry we accept without the user re-confirming. */
export const MAX_REASONABLE_MOI = 10_000_000;

/** Recording, correcting and removing moi entries. */
export class MoiRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<MoiEntry[]> {
    return this.source.listMoiEntries();
  }

  async create(input: NewMoiEntry): Promise<MoiEntry> {
    return this.source.createMoiEntry(this.validate(input));
  }

  async update(id: ID, patch: Partial<NewMoiEntry>): Promise<MoiEntry> {
    if (patch.amount != null) this.validateAmount(patch.amount, 'amount');
    return this.source.updateMoiEntry(id, patch);
  }

  remove(id: ID): Promise<void> {
    return this.source.deleteMoiEntry(id);
  }

  /**
   * Has this person already been recorded at this function? Used to warn about
   * a double entry — a real hazard when two people man the moi book at once.
   */
  async findExisting(functionId: ID, personId: ID): Promise<MoiEntry | undefined> {
    const entries = await this.source.listMoiEntries();
    return entries.find((e) => e.functionId === functionId && e.personId === personId);
  }

  private validate(input: NewMoiEntry): NewMoiEntry {
    if (!input.functionId) throw new ValidationError('Choose a function.', 'functionId');
    if (!input.personId) throw new ValidationError('Choose a person.', 'personId');

    if (input.kind === 'gift') {
      const giftName = input.giftName?.trim();
      if (!giftName) throw new ValidationError('Say what the gift was.', 'giftName');
      if (input.giftValue != null) this.validateAmount(input.giftValue, 'giftValue');
      return {
        ...input,
        // A gift's worth lives in giftValue. Pinning amount to 0 is what keeps
        // it out of the collection: every `sum(amount)` in the app then means
        // cash, with no branch to remember at each call site.
        amount: 0,
        giftName,
        giftValue: input.giftValue != null ? Math.round(input.giftValue) : undefined,
        notes: input.notes?.trim() || undefined,
      };
    }

    this.validateAmount(input.amount, 'amount');
    return {
      ...input,
      amount: Math.round(input.amount),
      giftName: undefined,
      giftValue: undefined,
      notes: input.notes?.trim() || undefined,
    };
  }

  private validateAmount(amount: number, field: 'amount' | 'giftValue'): void {
    const noun = field === 'amount' ? 'Amount' : 'Value';
    if (!Number.isFinite(amount)) throw new ValidationError('Enter an amount.', field);
    if (amount <= 0) throw new ValidationError(`${noun} must be more than zero.`, field);
    if (amount > MAX_REASONABLE_MOI) {
      throw new ValidationError(`That ${noun.toLowerCase()} looks too large. Check it once more.`, field);
    }
  }
}
