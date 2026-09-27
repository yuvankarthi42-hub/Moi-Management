import type { GiftEntry, GiftGiven, ID } from '../../domain/models';
import type { DataSource, NewGift, NewGiftGiven } from '../DataSource';
import { MAX_REASONABLE_MOI } from './MoiRepository';
import { ValidationError } from './errors';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Gifts, in both directions.
 *
 * A gift is defined by its name — "Silver bowl", "Saree", "Watch" — which is
 * the one thing required. A value may be added, but nothing in the app sums
 * it into a collection, so leaving it out costs the household nothing.
 */
export class GiftRepository {
  constructor(private readonly source: DataSource) {}

  // ------------------------------------------------ received at our functions

  list(): Promise<GiftEntry[]> {
    return this.source.listGifts();
  }

  async listForFunction(functionId: ID): Promise<GiftEntry[]> {
    const all = await this.source.listGifts();
    return all
      .filter((g) => g.functionId === functionId)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  async create(input: NewGift): Promise<GiftEntry> {
    if (!input.functionId) throw new ValidationError('Choose a function.', 'functionId');
    if (!input.personId) throw new ValidationError('Choose a person.', 'personId');
    return this.source.createGift(this.clean(input));
  }

  async update(id: ID, patch: Partial<NewGift>): Promise<GiftEntry> {
    return this.source.updateGift(id, this.cleanPatch(patch));
  }

  remove(id: ID): Promise<void> {
    return this.source.deleteGift(id);
  }

  // ------------------------------------------- given back at someone else's

  listGiven(): Promise<GiftGiven[]> {
    return this.source.listGiftsGiven();
  }

  async createGiven(input: NewGiftGiven): Promise<GiftGiven> {
    if (!input.personId) throw new ValidationError('Choose a person.', 'personId');
    if (!ISO_DATE.test(input.date ?? '')) throw new ValidationError('Choose a date.', 'date');
    return this.source.createGiftGiven({
      ...this.clean(input),
      date: input.date,
      occasion: input.occasion?.trim() || undefined,
    });
  }

  async updateGiven(id: ID, patch: Partial<NewGiftGiven>): Promise<GiftGiven> {
    return this.source.updateGiftGiven(id, {
      ...this.cleanPatch(patch),
      ...(patch.occasion !== undefined ? { occasion: patch.occasion?.trim() || undefined } : {}),
    });
  }

  removeGiven(id: ID): Promise<void> {
    return this.source.deleteGiftGiven(id);
  }

  // --------------------------------------------------------------- shared

  private clean<T extends { name: string; value?: number; notes?: string }>(input: T): T {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Say what the gift was.', 'name');
    if (input.value != null) this.validateValue(input.value);
    return {
      ...input,
      name,
      value: input.value != null ? Math.round(input.value) : undefined,
      notes: input.notes?.trim() || undefined,
    };
  }

  private cleanPatch<T extends { name?: string; value?: number; notes?: string }>(patch: T): T {
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new ValidationError('Say what the gift was.', 'name');
    }
    if (patch.value != null) this.validateValue(patch.value);
    return {
      ...patch,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || undefined } : {}),
    };
  }

  private validateValue(value: number): void {
    if (!Number.isFinite(value)) throw new ValidationError('Enter a value.', 'value');
    if (value <= 0) throw new ValidationError('Value must be more than zero.', 'value');
    if (value > MAX_REASONABLE_MOI) {
      throw new ValidationError('That value looks too large. Check it once more.', 'value');
    }
  }
}
