import {
  Connection,
  DeepPartial,
  ObjectType,
  Repository as TRepository,
} from 'typeorm';
import { Aggregate, GetAllInput, FRepository } from '../../domain';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as ReadonlyArray from 'fp-ts/lib/ReadonlyArray';
import * as ReadonlyNonEmptyArray from 'fp-ts/lib/ReadonlyNonEmptyArray';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';

export type TypeormFSerializer<A extends Aggregate, Entity> = (
  aggregate: A,
) => DeepPartial<Entity>;

export type TypeormFDeserializer<A extends Aggregate, Entity, E> = (
  entity: Entity,
) => Either.Either<E, A>;

export interface TypeormFRepositoryProps<A extends Aggregate, Entity, E> {
  readonly connection: Connection;
  readonly entity: ObjectType<Entity>;
  readonly serializer: TypeormFSerializer<A, Entity>;
  readonly deserializer: TypeormFDeserializer<A, Entity, E>;
  readonly errorBuilder: (message: string) => E;
  readonly softDelete: boolean;
}

export class TypeormFRepository<A extends Aggregate, Entity, E = Error>
  implements FRepository<A, E>
{
  protected connection: Connection;

  protected entity: ObjectType<Entity>;

  protected serializer: TypeormFSerializer<A, Entity>;

  protected deserializer: TypeormFDeserializer<A, Entity, E>;

  protected errorBuilder: (message: string) => E;

  protected softDelete: boolean;

  constructor(props: TypeormFRepositoryProps<A, Entity, E>) {
    this.connection = props.connection;
    this.entity = props.entity;
    this.serializer = props.serializer;
    this.deserializer = props.deserializer;
    this.errorBuilder = props.errorBuilder;
    this.softDelete = props.softDelete;
  }

  protected get repository(): TRepository<Entity> {
    return this.connection.getRepository(this.entity);
  }

  protected tryCatch = <T>(fn: () => Promise<T>) =>
    TaskEither.tryCatch(fn, e => this.errorBuilder((e as Error).message));

  protected getFromQuery = (
    makeQuery: () => Promise<Entity>,
  ): TaskEither.TaskEither<E, A> =>
    pipe(this.tryCatch(makeQuery), TaskEither.chainEitherK(this.deserializer));

  protected findFromQuery = (
    makeQuery: () => Promise<Entity | undefined>,
  ): TaskEither.TaskEither<E, Option.Option<A>> =>
    pipe(
      this.tryCatch(makeQuery),
      TaskEither.map(Option.fromNullable),
      TaskEither.chainEitherK(
        Option.traverse(Either.Applicative)(this.deserializer),
      ),
    );

  protected getManyFromQuery = (
    makeQuery: () => Promise<Array<Entity>>,
  ): TaskEither.TaskEither<E, ReadonlyArray<A>> =>
    pipe(
      this.tryCatch(makeQuery),
      TaskEither.chainEitherK(
        ReadonlyArray.traverse(Either.Applicative)(this.deserializer),
      ),
    );

  getById = (id: A['id']): TaskEither.TaskEither<E, A> =>
    this.getFromQuery(() => this.repository.findOneOrFail(id.toString()));

  getByIds = (
    ids: Array<A['id']>,
  ): TaskEither.TaskEither<E, ReadonlyArray<A>> =>
    this.getManyFromQuery(() =>
      this.repository.findByIds(ids.map(id => id.toString())),
    );

  findById = (id: A['id']): TaskEither.TaskEither<E, Option.Option<A>> =>
    this.findFromQuery(() => this.repository.findOne(id.toString()));

  private save = (entities: Array<DeepPartial<Entity>>) =>
    TaskEither.tryCatch(
      () => this.repository.save(entities as Array<Entity>),
      e => this.errorBuilder((e as Error).message),
    );

  store = <B extends A>(aggregate: B): TaskEither.TaskEither<E, B> =>
    pipe(
      this.save([this.serializer(aggregate)]),
      TaskEither.map(() => aggregate),
    );

  storeAll = <B extends A>(
    aggregates: Array<B>,
  ): TaskEither.TaskEither<E, ReadonlyArray<B>> =>
    pipe(
      aggregates.map(a =>
        this.repository.create.bind(this.repository)(this.serializer(a)),
      ),
      entities => this.save(entities),
      TaskEither.map(() => aggregates),
    );

  delete = (id: A['id']): TaskEither.TaskEither<E, void> =>
    pipe(
      this.tryCatch(() =>
        this.softDelete
          ? this.repository.softDelete(id.toString())
          : this.repository.delete(id.toString()),
      ),
      TaskEither.map(() => undefined),
    );

  deleteAll = (ids: ReadonlyArray<A['id']>): TaskEither.TaskEither<E, void> =>
    pipe(
      ReadonlyNonEmptyArray.fromReadonlyArray(ids.map(id => id.toString())),
      Option.traverse(TaskEither.ApplicativeSeq)(ids =>
        this.tryCatch(() =>
          this.softDelete
            ? this.repository.softDelete(Array.from(ids))
            : this.repository.delete(Array.from(ids)),
        ),
      ),
      TaskEither.map(() => undefined),
    );

  private buildGetAllSelectQueryBuilder(input: GetAllInput = {}) {
    let queryBuilder = this.repository.createQueryBuilder('alias');
    if (input.withDeleted) {
      queryBuilder = queryBuilder.withDeleted();
    }
    return queryBuilder;
  }

  getAll = (
    input: GetAllInput = {},
  ): TaskEither.TaskEither<E, ReadonlyArray<A>> =>
    this.getManyFromQuery(() =>
      this.buildGetAllSelectQueryBuilder(input).getMany(),
    );
}
