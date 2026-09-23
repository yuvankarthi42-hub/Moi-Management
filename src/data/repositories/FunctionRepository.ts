import type { FunctionEvent, ID, PersonEvent } from '../../domain/models';
import type { DataSource, NewFunction, NewPersonEvent } from '../DataSource';
import { NotFoundError, ValidationError } from './errors';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Functions the household hosts, plus the guest events we owe a return moi. */
export class FunctionRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<FunctionEvent[]> {
    return this.source.listFunctions();
  }

  get(id: ID): Promise<FunctionEvent | undefined> {
    return this.source.getFunction(id);
  }

  async create(input: NewFunction): Promise<FunctionEvent> {
    return this.source.createFunction(this.validate(input));
  }

  async update(id: ID, patch: Partial<NewFunction>): Promise<FunctionEvent> {
    const current = await this.source.getFunction(id);
    if (!current) throw new NotFoundError('That function');
    return this.source.updateFunction(id, this.validate({ ...current, ...patch }));
  }

  /** Deletes the function and every moi entry recorded against it. */
  remove(id: ID): Promise<void> {
    return this.source.deleteFunction(id);
  }

  async addPhoto(id: ID, uri: string): Promise<FunctionEvent> {
    const current = await this.source.getFunction(id);
    if (!current) throw new NotFoundError('That function');
    return this.source.updateFunction(id, { photos: [...(current.photos ?? []), uri] });
  }

  async removePhoto(id: ID, uri: string): Promise<FunctionEvent> {
    const current = await this.source.getFunction(id);
    if (!current) throw new NotFoundError('That function');
    return this.source.updateFunction(id, {
      photos: (current.photos ?? []).filter((p) => p !== uri),
    });
  }

  // --- guest-hosted events ------------------------------------------------

  listPersonEvents(): Promise<PersonEvent[]> {
    return this.source.listPersonEvents();
  }

  async createPersonEvent(input: NewPersonEvent): Promise<PersonEvent> {
    if (!input.title?.trim()) throw new ValidationError('Enter a function name.', 'title');
    if (!ISO_DATE.test(input.date)) throw new ValidationError('Choose a date.', 'date');
    if (!input.personId) throw new ValidationError('Choose a person.', 'personId');
    return this.source.createPersonEvent({ ...input, title: input.title.trim() });
  }

  updatePersonEvent(id: ID, patch: Partial<NewPersonEvent>): Promise<PersonEvent> {
    return this.source.updatePersonEvent(id, patch);
  }

  removePersonEvent(id: ID): Promise<void> {
    return this.source.deletePersonEvent(id);
  }

  private validate(input: NewFunction): NewFunction {
    const title = input.title?.trim();
    if (!title) throw new ValidationError('Enter a function name.', 'title');
    if (!ISO_DATE.test(input.date ?? '')) throw new ValidationError('Choose a date.', 'date');

    return {
      ...input,
      title,
      venue: input.venue?.trim() || undefined,
      village: input.village?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      time: input.time?.trim() || undefined,
      host: input.host?.trim() || undefined,
    };
  }
}
