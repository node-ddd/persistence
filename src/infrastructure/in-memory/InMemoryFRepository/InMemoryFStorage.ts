import cloneDeep from 'lodash.clonedeep';
import * as FPArray from 'fp-ts/lib/ReadonlyArray';
import * as Ord from 'fp-ts/lib/Ord';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import * as Eq from 'fp-ts/lib/Eq';
import * as ReadonlyMap from 'fp-ts/lib/ReadonlyMap';
import { pipe } from 'fp-ts/lib/function';
import { Predicate } from '../InMemoryRepository';
import { Aggregate } from '../../../domain';

interface InMemoryFStorageProps<A extends Aggregate, E> {
  aggregateName: string;
  eqId: Eq.Eq<A['id']>;
  errorBuilder: (message: string) => E;
}

export class InMemoryFStorage<A extends Aggregate, E> {
  aggregateName: string;

  private aggregates: ReadonlyMap<A['id'], A>;

  private trash: ReadonlyMap<A['id'], A>;

  private eqId: Eq.Eq<A['id']>;
  private errorBuilder: (message: string) => E;

  constructor(props: InMemoryFStorageProps<A, E>) {
    this.aggregateName = props.aggregateName;
    this.eqId = props.eqId;
    this.errorBuilder = props.errorBuilder;
    this.aggregates = new Map();
    this.trash = new Map();
  }

  private updateAggregates = (aggregates: ReadonlyMap<A['id'], A>) => {
    this.aggregates = aggregates;
  };

  private updateTrash = (trash: ReadonlyMap<A['id'], A>) => {
    this.trash = trash;
  };

  findById = (id: A['id']): Option.Option<A> =>
    pipe(
      this.aggregates,
      ReadonlyMap.lookup(this.eqId)(id),
      Option.map(cloneDeep),
    );

  getById = (id: A['id']): Either.Either<E, A> =>
    pipe(
      this.findById(id),
      Either.fromOption(() =>
        this.errorBuilder(
          `Aggregate ${this.aggregateName} not found with id ${id}`,
        ),
      ),
    );

  getByIds = (ids: ReadonlyArray<A['id']>): ReadonlyArray<A> =>
    this.getAllBy(a => ids.includes(a.id));

  private getAggregatesAsArray = (): ReadonlyArray<A> =>
    pipe(
      this.aggregates,
      ReadonlyMap.values(Ord.fromCompare(() => 0)),
      cloneDeep,
    );

  private getTrashAsArray = (): ReadonlyArray<A> =>
    pipe(this.trash, ReadonlyMap.values(Ord.fromCompare(() => 0)), cloneDeep);

  getAll = ({
    withDeleted = false,
  }: { withDeleted?: boolean } = {}): ReadonlyArray<A> =>
    withDeleted
      ? this.getAggregatesAsArray().concat(this.getTrashAsArray())
      : this.getAggregatesAsArray();

  getAllBy = (predicate: Predicate<A>): ReadonlyArray<A> =>
    pipe(this.getAll(), FPArray.filter(predicate));

  findOneBy = (predicate: Predicate<A>): Option.Option<A> =>
    pipe(this.getAll(), FPArray.findFirst(predicate));

  getOneBy = (predicate: Predicate<A>, onNone: () => E): Either.Either<E, A> =>
    pipe(this.findOneBy(predicate), Either.fromOption(onNone));

  store = <B extends A>(aggregate: B): B =>
    pipe(
      this.aggregates as Map<A['id'], B>,
      ReadonlyMap.upsertAt(this.eqId)(aggregate.id, aggregate),
      this.updateAggregates,
      () => aggregate,
    );

  storeAll = <B extends A>(aggregates: ReadonlyArray<B>): ReadonlyArray<B> =>
    pipe(aggregates, FPArray.map(this.store));

  private storeInTrash = (aggregate: A) =>
    pipe(
      this.trash,
      ReadonlyMap.upsertAt(this.eqId)(aggregate.id, aggregate),
      this.updateTrash,
    );

  remove = (id: A['id']) => {
    pipe(this.findById(id), Option.map(this.storeInTrash));
    pipe(
      this.aggregates,
      ReadonlyMap.deleteAt(this.eqId)(id),
      this.updateAggregates,
    );
  };

  removeAll = (ids: ReadonlyArray<A['id']>) =>
    pipe(
      this.aggregates,
      ReadonlyMap.partition(aggregate => ids.includes(aggregate.id)),
      ({ left: remainingAggregates, right: deletedAggregates }) => {
        pipe(deletedAggregates, ReadonlyMap.map(this.storeInTrash));
        pipe(remainingAggregates, this.updateAggregates);
      },
    );
}
