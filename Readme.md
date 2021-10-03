# About

A library for building a persistence layer with NodeJS

## Getting Started

### 1. Installation

```bash
$ npm install @node-ddd/persistence
# OR
$ yarn add @node-ddd/persistence
```

### 2. Create a Repository interface for your aggregate

```ts
import { Repository } from '@node-ddd/persistence';
import { User } from './User';

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
}
```

The `Repository` interface contains a set of basic methods, but you can add your own methods by extending the interface

### 3. Create an InMemory implementation

```ts
import { InMemoryRepository } from '@node-ddd/persistence';
import { UserRepository } from 'domain';
import { User } from './User';

export class InMemoryUserRepository
  extends InMemoryRepository<User>
  implements UserRepository
{
  constructor(aggregates?: ReadonlyArray<User>) {
    super({ aggregateName: 'User', aggregates });
  }
  findByEmail = (email: string): Promise<User | null> =>
    this.findOneBy(user => user.email === email);
}
```

### 4. Create a Typeorm implementation

```ts
import { TypeormRepository } from '@node-ddd/persistence';
import { getConnection } from 'typeorm';
import { User, UserRepository } from 'domain';
import { UserEntity } from './UserEntity';

export class TypeormUserRepository
  extends TypeormRepository<User, UserEntity>
  implements UserRepository
{
  constructor() {
    super({
      connection: getConnection(),
      deserializer: user =>
        new User({
          id: toUserId(user.id),
          fullName: user.fullName,
          email: user.email,
        }),
      serializer: user => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      }),
      entity: UserEntity,
    });
  }

  findByEmail = (email: string): Promise<User | null> =>
    this.findFromQuery(() => this.repository.findOne({ email }));
}
```

## Roadmap

- [ ] Create a functional programming interface and implementation (with `fp-ts`)
- [ ] Create a `prisma` implementation
