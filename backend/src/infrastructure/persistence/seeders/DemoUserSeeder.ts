import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { hashPassword } from '../../security/PasswordHasher'

export class DemoUserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (await em.findOne(UserEntity, { email: 'demo@kairos.app' })) return
    const user = em.create(UserEntity, {
      email: 'demo@kairos.app',
      password: await hashPassword('demo1234'),
      name: 'Demo User',
      role: 'USER',
    })
    em.persist(user)
  }
}
