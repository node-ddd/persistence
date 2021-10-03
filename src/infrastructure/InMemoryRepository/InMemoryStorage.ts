import cloneDeep from 'lodash.clonedeep';
import { Aggregate } from '../../domain/Repository/Repository';
import { Predicate } from './Predicate';

export class InMemoryStorage<A extends Aggregate> {
  aggregateName: string;

  private aggregates: Map<A['id'], A>;

  private trash: Map<A['id'], A>;

  constructor(aggregateName: string) {
    this.aggregateName = aggregateName;
    this.aggregates = new Map();
    this.trash = new Map();
  }

  private updateAggregates = (aggregates: Map<A['id'], A>) => {
    this.aggregates = aggregates;
  };

  private updateTrash = (trash: Map<A['id'], A>) => {
    this.trash = trash;
  };

  findById = (id: A['id']): A | null =>
    cloneDeep(this.aggregates.get(id)) ?? null;

  getById = (id: A['id']): A => {
    const aggregate = this.findById(id);
    if (!aggregate) {
      throw new Error(
        `Aggregate ${this.aggregateName} not found with id ${id}`,
      );
    }
    return aggregate;
  };

  getByIds = (ids: ReadonlyArray<A['id']>): Array<A> =>
    this.getAllBy(a => ids.includes(a.id));

  private getAggregatesAsArray = (): Array<A> =>
    cloneDeep(Array.from(this.aggregates.values()));

  private getTrashAsArray = (): Array<A> =>
    cloneDeep(Array.from(this.trash.values()));

  getAll = ({
    withDeleted = false,
  }: { withDeleted?: boolean } = {}): Array<A> =>
    withDeleted
      ? this.getAggregatesAsArray().concat(this.getTrashAsArray())
      : this.getAggregatesAsArray();

  getAllBy = (predicate: Predicate<A>): Array<A> =>
    this.getAll().filter(predicate);

  findOneBy = (predicate: Predicate<A>): A | null =>
    this.getAll().find(predicate) ?? null;

  getOneBy = (predicate: Predicate<A>, errorMessage: string): A => {
    const aggregate = this.getAll().find(predicate);
    if (!aggregate) throw new Error(errorMessage);
    return aggregate;
  };

  store = <B extends A>(aggregate: B): B => {
    this.aggregates.set(aggregate.id, aggregate);
    return aggregate;
  };

  storeAll = <B extends A>(aggregates: ReadonlyArray<B>): Array<B> =>
    aggregates.map(this.store);

  private storeInTrash = (aggregate: A) => {
    this.trash.set(aggregate.id, aggregate);
    return aggregate;
  };

  remove = (id: A['id']): void => {
    const aggregate = this.findById(id);
    if (aggregate) {
      this.storeInTrash(aggregate);
      this.aggregates.delete(id);
    }
  };

  removeAll = (ids: ReadonlyArray<A['id']>): void => {
    this.getAllBy(({ id }) => ids.includes(id)).map(({ id }) =>
      this.remove(id),
    );
  };
}
