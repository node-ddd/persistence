import * as TaskEither from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import * as Eq from 'fp-ts/lib/Eq';

import { InMemoryFStorage } from './InMemoryFStorage';
import { Predicate } from '../InMemoryRepository';
import { Aggregate, FRepository, GetAllInput } from '../../../domain';

export interface InMemoryFRepositoryProps<A extends Aggregate, E> {
  aggregateName: string;
  aggregates?: ReadonlyArray<A>;
  eqId: Eq.Eq<A['id']>;
  errorBuilder: (message: string) => E;
}

export abstract class InMemoryFRepository<A extends Aggregate, E = Error>
  implements FRepository<A, E>
{
  private storage: InMemoryFStorage<A, E>;

  constructor(props: InMemoryFRepositoryProps<A, E>) {
    this.storage = new InMemoryFStorage<A, E>({
      aggregateName: props.aggregateName,
      eqId: props.eqId,
      errorBuilder: props.errorBuilder,
    });
    if (props.aggregates) {
      this.storage.storeAll(props.aggregates);
    }
  }

  protected findOneBy = (predicate: Predicate<A>) =>
    pipe(this.storage.findOneBy(predicate), TaskEither.right);

  protected getOneBy = (predicate: Predicate<A>, onNone: () => E) =>
    pipe(this.storage.getOneBy(predicate, onNone), TaskEither.fromEither);

  protected getAllBy = (predicate: Predicate<A>) =>
    pipe(this.storage.getAllBy(predicate), TaskEither.right);

  getById = (id: A['id']) =>
    pipe(this.storage.getById(id), TaskEither.fromEither);

  getByIds = (ids: ReadonlyArray<A['id']>) =>
    pipe(this.storage.getByIds(ids), TaskEither.right);

  findById = (id: A['id']) => pipe(this.storage.findById(id), TaskEither.right);

  store = <B extends A>(aggregate: B) =>
    pipe(this.storage.store(aggregate), TaskEither.right);

  storeAll = <B extends A>(aggregates: ReadonlyArray<B>) =>
    pipe(this.storage.storeAll(aggregates), TaskEither.right);

  delete = (id: A['id']) => pipe(this.storage.remove(id), TaskEither.right);

  deleteAll = (ids: ReadonlyArray<A['id']>) =>
    pipe(this.storage.removeAll(ids), TaskEither.right);

  getAll = ({ withDeleted }: GetAllInput = {}): TaskEither.TaskEither<
    E,
    ReadonlyArray<A>
  > => pipe(this.storage.getAll({ withDeleted }), TaskEither.right);
}
