import type { FamilyMember, FamilyRole, ID } from '../../domain/models';
import { roleCan, type Permission } from '../../domain/categories';
import type { DataSource, NewFamilyMember } from '../DataSource';
import { NotFoundError, ValidationError } from './errors';

/**
 * Family collaboration (spec §16).
 *
 * Roles are enforced here rather than in the UI, so a screen cannot bypass a
 * permission by simply rendering a button.
 */
export class FamilyMemberRepository {
  constructor(private readonly source: DataSource) {}

  list(): Promise<FamilyMember[]> {
    return this.source.listFamilyMembers();
  }

  /** The signed-in user's own membership — the source of their permissions. */
  async currentMember(): Promise<FamilyMember | undefined> {
    const members = await this.source.listFamilyMembers();
    return members.find((m) => m.isSelf) ?? members.find((m) => m.role === 'owner');
  }

  async can(permission: Permission): Promise<boolean> {
    const member = await this.currentMember();
    // With no membership records at all, the app is single-user: allow everything.
    return member ? roleCan(member.role, permission) : true;
  }

  /** Throws unless the current user holds `permission`. */
  async assertCan(permission: Permission): Promise<void> {
    if (!(await this.can(permission))) {
      throw new ValidationError('You do not have permission to do that.');
    }
  }

  async create(input: NewFamilyMember): Promise<FamilyMember> {
    await this.assertCan('family.manage');
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Enter a name.', 'name');
    return this.source.createFamilyMember({ ...input, name });
  }

  async setRole(id: ID, role: FamilyRole): Promise<FamilyMember> {
    await this.assertCan('family.manage');
    const members = await this.source.listFamilyMembers();
    const member = members.find((m) => m.id === id);
    if (!member) throw new NotFoundError('That family member');

    // The household must always keep at least one owner.
    if (member.role === 'owner' && role !== 'owner') {
      const owners = members.filter((m) => m.role === 'owner');
      if (owners.length <= 1) {
        throw new ValidationError('There must always be one owner.', 'role');
      }
    }
    return this.source.updateFamilyMember(id, { role });
  }

  async remove(id: ID): Promise<void> {
    await this.assertCan('family.manage');
    const members = await this.source.listFamilyMembers();
    const member = members.find((m) => m.id === id);
    if (!member) throw new NotFoundError('That family member');
    if (member.isSelf) throw new ValidationError('You cannot remove yourself.');
    if (member.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1) {
      throw new ValidationError('There must always be one owner.');
    }
    return this.source.deleteFamilyMember(id);
  }
}
