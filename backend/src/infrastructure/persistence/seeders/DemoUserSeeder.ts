import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { hashPassword } from '../../security/PasswordHasher'

const DEMO_USERS = [
  { email: 'admin@kairos.app', password: 'admin1234', name: 'Admin User', role: 'ADMIN' as const },
  { email: 'user@kairos.app', password: 'user1234', name: 'Test User', role: 'USER' as const },
]

export class DemoUserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    for (const demo of DEMO_USERS) {
      if (await em.findOne(UserEntity, { email: demo.email })) continue
      const user = em.create(UserEntity, {
        email: demo.email,
        password: await hashPassword(demo.password),
        name: demo.name,
        role: demo.role,
      })
      em.persist(user)
    }
  }
}
