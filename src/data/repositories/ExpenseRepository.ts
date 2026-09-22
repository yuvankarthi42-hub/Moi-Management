import type { Expense, ID } from '../../domain/models';
import type { DataSource, NewExpense } from '../DataSource';
import { ValidationError } from './errors';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Function expenses.
 *
 * Note there is deliberately no "budget" concept here: the product rule is that
 * expenses are secondary to moi and always belong to one function (spec §14),
 * so an expense can never be created without a `functionId`.
 */
export class ExpenseRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<Expense[]> {
    return this.source.listExpenses();
  }

  async listForFunction(functionId: ID): Promise<Expense[]> {
    const all = await this.source.listExpenses();
    return all
      .filter((e) => e.functionId === functionId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async create(input: NewExpense): Promise<Expense> {
    return this.source.createExpense(this.validate(input));
  }

  async update(id: ID, patch: Partial<NewExpense>): Promise<Expense> {
    if (patch.amount != null) this.validateAmount(patch.amount);
    return this.source.updateExpense(id, patch);
  }

  remove(id: ID): Promise<void> {
    return this.source.deleteExpense(id);
  }

  private validate(input: NewExpense): NewExpense {
    if (!input.functionId) throw new ValidationError('Choose a function.', 'functionId');
    if (!input.category) throw new ValidationError('Choose a category.', 'category');
    if (!ISO_DATE.test(input.date ?? '')) throw new ValidationError('Choose a date.', 'date');
    this.validateAmount(input.amount);
    return {
      ...input,
      amount: Math.round(input.amount),
      paidBy: input.paidBy?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
  }

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount)) throw new ValidationError('Enter an amount.', 'amount');
    if (amount <= 0) throw new ValidationError('Amount must be more than zero.', 'amount');
  }
}
