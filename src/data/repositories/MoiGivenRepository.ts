import type { ID, MoiGiven } from '../../domain/models';
import type { DataSource, NewMoiGiven } from '../DataSource';
import { MAX_REASONABLE_MOI } from './MoiRepository';
import { ValidationError } from './errors';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Moi the household has given back to someone.
 *
 * The mirror of `MoiRepository`: same amount rules, but tied to a person and
 * the occasion rather than to one of our own functions.
 */
export class MoiGivenRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<MoiGiven[]> {
    return this.source.listMoiGiven();
  }

  async listForPerson(personId: ID): Promise<MoiGiven[]> {
    const all = await this.source.listMoiGiven();
    return all
      .filter((g) => g.personId === personId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async create(input: NewMoiGiven): Promise<MoiGiven> {
    return this.source.createMoiGiven(this.validate(input));
  }

  async update(id: ID, patch: Partial<NewMoiGiven>): Promise<MoiGiven> {
    if (patch.amount != null) this.validateAmount(patch.amount);
    return this.source.updateMoiGiven(id, patch);
  }

  remove(id: ID): Promise<void> {
    return this.source.deleteMoiGiven(id);
  }

  /** What has already been given towards one of the person's own functions. */
  async totalForEvent(personEventId: ID): Promise<number> {
    const all = await this.source.listMoiGiven();
    return all
      .filter((g) => g.personEventId === personEventId)
      .reduce((total, g) => total + g.amount, 0);
  }

  private validate(input: NewMoiGiven): NewMoiGiven {
    if (!input.personId) throw new ValidationError('Choose a person.', 'personId');
    if (!ISO_DATE.test(input.date ?? '')) throw new ValidationError('Choose a date.', 'date');
    this.validateAmount(input.amount);
    return {
      ...input,
      amount: Math.round(input.amount),
      occasion: input.occasion?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
  }

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount)) throw new ValidationError('Enter an amount.', 'amount');
    if (amount <= 0) throw new ValidationError('Amount must be more than zero.', 'amount');
    if (amount > MAX_REASONABLE_MOI) {
      throw new ValidationError('That amount looks too large. Check it once more.', 'amount');
    }
  }
}
