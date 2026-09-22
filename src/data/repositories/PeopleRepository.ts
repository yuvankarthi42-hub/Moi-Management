import type { Family, ID, Person } from '../../domain/models';
import type { DataSource, NewFamily, NewPerson } from '../DataSource';
import { NotFoundError, ValidationError } from './errors';

/** People and families, with the rules that keep the contact book clean. */
export class PeopleRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<Person[]> {
    return this.source.listPeople();
  }

  get(id: ID): Promise<Person | undefined> {
    return this.source.getPerson(id);
  }

  async create(input: NewPerson): Promise<Person> {
    const clean = this.validate(input);
    // A duplicate phone almost always means the same person entered twice,
    // which would silently split their moi history across two records.
    if (clean.phone) {
      const existing = await this.findByPhone(clean.phone);
      if (existing) {
        throw new ValidationError(
          `${existing.name} already uses this phone number.`,
          'phone',
        );
      }
    }
    return this.source.createPerson(clean);
  }

  async update(id: ID, patch: Partial<NewPerson>): Promise<Person> {
    const current = await this.source.getPerson(id);
    if (!current) throw new NotFoundError('That person');
    const clean = this.validate({ ...current, ...patch });
    if (clean.phone && clean.phone !== current.phone) {
      const existing = await this.findByPhone(clean.phone);
      if (existing && existing.id !== id) {
        throw new ValidationError(`${existing.name} already uses this phone number.`, 'phone');
      }
    }
    return this.source.updatePerson(id, clean);
  }

  /** Deletes the person *and* their moi history — callers must confirm first. */
  remove(id: ID): Promise<void> {
    return this.source.deletePerson(id);
  }

  async findByPhone(phone: string): Promise<Person | undefined> {
    const digits = normalisePhone(phone);
    if (!digits) return undefined;
    const people = await this.source.listPeople();
    return people.find((p) => p.phone && normalisePhone(p.phone) === digits);
  }

  listFamilies(): Promise<Family[]> {
    return this.source.listFamilies();
  }

  async createFamily(input: NewFamily): Promise<Family> {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Enter a family name.', 'name');
    return this.source.createFamily({ ...input, name });
  }

  async updateFamily(id: ID, patch: Partial<NewFamily>): Promise<Family> {
    if (patch.name != null && !patch.name.trim()) {
      throw new ValidationError('Enter a family name.', 'name');
    }
    return this.source.updateFamily(id, patch);
  }

  removeFamily(id: ID): Promise<void> {
    return this.source.deleteFamily(id);
  }

  private validate(input: NewPerson): NewPerson {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Enter the person’s name.', 'name');
    if (name.length > 80) throw new ValidationError('Name is too long.', 'name');

    const phone = input.phone ? normalisePhone(input.phone) : undefined;
    if (phone && (phone.length < 6 || phone.length > 15)) {
      throw new ValidationError('Enter a valid phone number.', 'phone');
    }

    return {
      ...input,
      name,
      phone,
      village: input.village?.trim() || undefined,
      relation: input.relation?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
  }
}

/** Strips formatting and a leading country code so numbers compare reliably. */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}
