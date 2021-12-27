import {
  Connection,
  DeepPartial,
  ObjectType,
  Repository as TRepository,
} from 'typeorm';
import { Aggregate, GetAllInput, Repository } from '../../../domain';

export type TypeormSerializer<A extends Aggregate, Entity> = (
  aggregate: A,
) => DeepPartial<Entity>;

export type TypeormDeserializer<A extends Aggregate, Entity> = (
  entity: Entity,
) => A;

export interface TypeormRepositoryProps<A extends Aggregate, Entity> {
  readonly connection: Connection;
  readonly entity: ObjectType<Entity>;
  readonly serializer: TypeormSerializer<A, Entity>;
  readonly deserializer: TypeormDeserializer<A, Entity>;
  readonly softDelete: boolean;
}

export class TypeormRepository<A extends Aggregate, Entity>
  implements Repository<A>
{
  protected connection: Connection;

  protected entity: ObjectType<Entity>;

  protected serializer: TypeormSerializer<A, Entity>;

  protected deserializer: TypeormDeserializer<A, Entity>;

  protected softDelete: boolean;

  constructor(props: TypeormRepositoryProps<A, Entity>) {
    this.connection = props.connection;
    this.entity = props.entity;
    this.serializer = props.serializer;
    this.deserializer = props.deserializer;
    this.softDelete = props.softDelete;
  }

  protected get repository(): TRepository<Entity> {
    return this.connection.getRepository(this.entity);
  }

  protected getFromQuery = async (
    makeQuery: () => Promise<Entity>,
  ): Promise<A> => {
    const entity = await makeQuery();
    return this.deserializer(entity);
  };

  protected getManyFromQuery = async (
    makeQuery: () => Promise<Array<Entity>>,
  ): Promise<Array<A>> => {
    const entities = await makeQuery();
    return entities.map(this.deserializer);
  };

  protected findFromQuery = async (
    makeQuery: () => Promise<Entity | null | undefined>,
  ): Promise<A | null> => {
    const entity = await makeQuery();
    return entity ? this.deserializer(entity) : null;
  };

  getById = (id: A['id']): Promise<A> =>
    this.getFromQuery(() => this.repository.findOneOrFail(id.toString()));

  getByIds = (ids: Array<A['id']>): Promise<Array<A>> =>
    this.getManyFromQuery(() =>
      this.repository.findByIds(ids.map(id => id.toString())),
    );

  findById = (id: A['id']): Promise<A | null> =>
    this.findFromQuery(() => this.repository.findOne(id.toString()));

  store = async <B extends A>(aggregate: B): Promise<B> => {
    await this.storeAll([aggregate]);
    return aggregate;
  };

  private save = async (entities: Array<Entity>) => {
    await this.repository.save(entities as Array<Entity>);
  };

  storeAll = async <B extends A>(aggregates: Array<B>): Promise<Array<B>> => {
    const entities = aggregates.map(a =>
      this.repository.create.bind(this.repository)(this.serializer(a)),
    );
    await this.save(entities);
    return aggregates;
  };

  delete = async (id: A['id']): Promise<void> => {
    if (this.softDelete) {
      await this.repository.softDelete(id.toString());
    } else {
      await this.repository.delete(id.toString());
    }
  };

  deleteAll = async (ids: ReadonlyArray<A['id']>): Promise<void> => {
    if (this.softDelete) {
      await this.repository.softDelete(ids.map(id => id.toString()));
    } else {
      await this.repository.delete(ids.map(id => id.toString()));
    }
  };

  getAll = async (input: GetAllInput = {}): Promise<ReadonlyArray<A>> => {
    let queryBuilder = this.repository.createQueryBuilder('alias');
    if (input.withDeleted) {
      queryBuilder = queryBuilder.withDeleted();
    }

    return this.getManyFromQuery(() => queryBuilder.getMany());
  };
}
