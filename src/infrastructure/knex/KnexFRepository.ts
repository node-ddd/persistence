import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import Option from 'fp-ts/lib/Option';
import * as ReadonlyArray from 'fp-ts/lib/ReadonlyArray';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { Knex } from 'knex';
import { Aggregate, FRepository } from '../../domain';

export type KnexFSerializer<A extends Aggregate> = (aggregate: A) => unknown;
export type KnexFDeserializer<A extends Aggregate, E> = (
  raw: unknown,
) => Either.Either<E, A>;

export interface KnexFRepositoryProps<A extends Aggregate, E> {
  readonly knex: Knex;
  readonly table: string;
  readonly serializer: KnexFSerializer<A>;
  readonly deserializer: KnexFDeserializer<A, E>;
  readonly errorBuilder: (message: string) => E;
}

export class KnexFRepository<A extends Aggregate, E = Error>
  implements FRepository<A, E>
{
  protected knex: Knex;
  protected table: string;
  protected serializer: KnexFSerializer<A>;
  protected deserializer: KnexFDeserializer<A, E>;
  protected errorBuilder: (message: string) => E;

  constructor(props: KnexFRepositoryProps<A, E>) {
    this.knex = props.knex;
    this.table = props.table;
    this.serializer = props.serializer;
    this.deserializer = props.deserializer;
    this.errorBuilder = props.errorBuilder;
  }

  private tryCatch = <T>(fn: () => Promise<T>) =>
    TaskEither.tryCatch(fn, e => this.errorBuilder((e as Error).message));

  protected getFromQuery = (
    makeQuery: () => Promise<unknown>,
  ): TaskEither.TaskEither<E, A> =>
    pipe(this.tryCatch(makeQuery), TaskEither.chainEitherK(this.deserializer));

  protected findFromQuery = (
    makeQuery: () => Promise<unknown | undefined>,
  ): TaskEither.TaskEither<E, Option.Option<A>> =>
    pipe(
      this.tryCatch(makeQuery),
      TaskEither.map(Option.fromNullable),
      TaskEither.chainEitherK(
        Option.traverse(Either.Applicative)(this.deserializer),
      ),
    );

  protected getManyFromQuery = (
    makeQuery: () => Promise<Array<unknown>>,
  ): TaskEither.TaskEither<E, ReadonlyArray<A>> =>
    pipe(
      this.tryCatch(makeQuery),
      TaskEither.chainEitherK(
        ReadonlyArray.traverse(Either.Applicative)(this.deserializer),
      ),
    );

  getById = (id: A['id']): TaskEither.TaskEither<E, A> =>
    this.getFromQuery(() =>
      this.knex.table(this.table).where({ id: id.toString() }).first(),
    );

  findById = (id: A['id']): TaskEither.TaskEither<E, Option.Option<A>> =>
    this.findFromQuery(() =>
      this.knex.table(this.table).where({ id: id.toString() }).first(),
    );

  getByIds = (
    ids: ReadonlyArray<A['id']>,
  ): TaskEither.TaskEither<E, readonly A[]> =>
    this.getManyFromQuery(() =>
      this.knex.table(this.table).whereIn(
        'id',
        ids.map(id => id.toString()),
      ),
    );

  getAll = (): TaskEither.TaskEither<E, readonly A[]> =>
    this.getManyFromQuery(() => this.knex.table(this.table).select());

  delete = (id: A['id']): TaskEither.TaskEither<E, void> =>
    pipe(
      this.tryCatch(() =>
        this.knex.table(this.table).where({ id: id.toString() }).del(),
      ),
      TaskEither.map(() => undefined),
    );

  deleteAll = (ids: ReadonlyArray<A['id']>): TaskEither.TaskEither<E, void> =>
    pipe(
      this.tryCatch(() =>
        this.knex
          .table(this.table)
          .whereIn(
            'id',
            ids.map(id => id.toString()),
          )
          .del(),
      ),
      TaskEither.map(() => undefined),
    );

  store = <B extends A>(aggregate: B): TaskEither.TaskEither<E, B> =>
    pipe(
      this.storeAll([aggregate]),
      TaskEither.map(([a]) => a),
    );

  storeAll = <B extends A>(
    aggregates: ReadonlyArray<B>,
  ): TaskEither.TaskEither<E, readonly B[]> =>
    pipe(
      this.tryCatch(() =>
        this.knex
          .table(this.table)
          .insert<unknown>(aggregates.map(this.serializer))
          .onConflict('id')
          .merge(),
      ),
      TaskEither.map(() => aggregates),
    );
}
