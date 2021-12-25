import { Aggregate, GetAllInput } from '../Repository';
import * as Option from 'fp-ts/lib/Option';
import * as TaskEither from 'fp-ts/lib/TaskEither';

export interface FRepository<A extends Aggregate, E = Error> {
  getById(id: A['id']): TaskEither.TaskEither<E, A>;
  getByIds(
    ids: ReadonlyArray<A['id']>,
  ): TaskEither.TaskEither<E, ReadonlyArray<A>>;
  findById(id: A['id']): TaskEither.TaskEither<E, Option.Option<A>>;
  store<B extends A>(aggregate: B): TaskEither.TaskEither<E, B>;
  storeAll<B extends A>(
    aggregates: ReadonlyArray<B>,
  ): TaskEither.TaskEither<E, ReadonlyArray<B>>;
  delete(id: A['id']): TaskEither.TaskEither<E, void>;
  deleteAll(ids: ReadonlyArray<A['id']>): TaskEither.TaskEither<E, void>;
  getAll(options?: GetAllInput): TaskEither.TaskEither<E, ReadonlyArray<A>>;
}
