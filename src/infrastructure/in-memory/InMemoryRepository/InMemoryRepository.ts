import {
  Aggregate,
  GetAllInput,
  Repository,
} from '../../../domain/Repository/Repository';
import { InMemoryStorage } from './InMemoryStorage';
import { Predicate } from './Predicate';

export interface InMemoryRepositoryProps<A extends Aggregate> {
  aggregateName: string;
  aggregates?: ReadonlyArray<A>;
}

export abstract class InMemoryRepository<A extends Aggregate>
  implements Repository<A>
{
  private storage: InMemoryStorage<A>;

  constructor(props: InMemoryRepositoryProps<A>) {
    this.storage = new InMemoryStorage<A>(props.aggregateName);
    if (props.aggregates) {
      this.storage.storeAll(props.aggregates);
    }
  }

  protected getOneBy = async (
    predicate: Predicate<A>,
    errorMessage: string,
  ): Promise<A> => this.storage.getOneBy(predicate, errorMessage);

  protected findOneBy = async (predicate: Predicate<A>): Promise<A | null> =>
    this.storage.findOneBy(predicate);

  protected getAllBy = async (predicate: Predicate<A>): Promise<Array<A>> =>
    this.storage.getAllBy(predicate);

  getById = async (id: A['id']): Promise<A> => this.storage.getById(id);

  getByIds = async (ids: ReadonlyArray<A['id']>): Promise<Array<A>> =>
    this.storage.getByIds(ids);

  findById = async (id: A['id']): Promise<A | null> =>
    this.storage.findById(id);

  store = async <B extends A>(aggregate: B): Promise<B> =>
    this.storage.store(aggregate);

  storeAll = async <B extends A>(
    aggregates: ReadonlyArray<B>,
  ): Promise<ReadonlyArray<B>> => this.storage.storeAll(aggregates);

  delete = async (id: A['id']): Promise<void> => this.storage.remove(id);

  deleteAll = async (ids: ReadonlyArray<A['id']>): Promise<void> =>
    this.storage.removeAll(ids);

  getAll = async ({ withDeleted }: GetAllInput = {}): Promise<
    ReadonlyArray<A>
  > => this.storage.getAll({ withDeleted });
}
