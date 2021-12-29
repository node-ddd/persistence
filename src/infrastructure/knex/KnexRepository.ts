import { Knex } from 'knex';
import { Aggregate, Repository } from '../../domain';

export type KnexSerializer<A extends Aggregate> = (aggregate: A) => unknown;
export type KnexDeserializer<A extends Aggregate> = (raw: unknown) => A;

export interface KnexRepositoryProps<A extends Aggregate> {
  readonly knex: Knex;
  readonly table: string;
  readonly serializer: KnexSerializer<A>;
  readonly deserializer: KnexDeserializer<A>;
}

export class KnexRepository<A extends Aggregate> implements Repository<A> {
  protected knex: Knex;
  protected table: string;
  protected serializer: KnexSerializer<A>;
  protected deserializer: KnexDeserializer<A>;

  constructor(props: KnexRepositoryProps<A>) {
    this.knex = props.knex;
    this.table = props.table;
    this.serializer = props.serializer;
    this.deserializer = props.deserializer;
  }

  protected getFromQuery = (makeQuery: () => Promise<unknown>): Promise<A> =>
    makeQuery().then(this.deserializer);

  protected findFromQuery = (
    makeQuery: () => Promise<unknown | undefined | null>,
  ): Promise<A | null> =>
    makeQuery().then(a => (a ? this.deserializer(a) : null));

  protected getManyFromQuery = (
    makeQuery: () => Promise<Array<unknown>>,
  ): Promise<ReadonlyArray<A>> =>
    makeQuery().then(a => a.map(this.deserializer));

  getById = (id: A['id']): Promise<A> =>
    this.getFromQuery(() =>
      this.knex
        .table(this.table)
        .where({ id: id.toString() })
        .first()
        .then(a => {
          if (!a) {
            throw new Error(`Could not found ${id} in table ${this.table}`);
          }
          return a;
        }),
    );

  findById = (id: A['id']): Promise<A | null> =>
    this.findFromQuery(() =>
      this.knex.table(this.table).where({ id: id.toString() }).first(),
    );

  getByIds = (ids: ReadonlyArray<A['id']>): Promise<readonly A[]> =>
    this.getManyFromQuery(() =>
      this.knex.table(this.table).whereIn(
        'id',
        ids.map(id => id.toString()),
      ),
    );

  getAll = (): Promise<readonly A[]> =>
    this.getManyFromQuery(() => this.knex.table(this.table).select());

  delete = async (id: A['id']): Promise<void> => {
    await this.knex.table(this.table).where({ id: id.toString() }).del();
  };

  deleteAll = async (ids: ReadonlyArray<A['id']>): Promise<void> => {
    await this.knex
      .table(this.table)
      .whereIn(
        'id',
        ids.map(id => id.toString()),
      )
      .del();
  };

  store = async <B extends A>(aggregate: B): Promise<B> => {
    const [a] = await this.storeAll([aggregate]);
    return a;
  };

  storeAll = async <B extends A>(
    aggregates: ReadonlyArray<B>,
  ): Promise<readonly B[]> => {
    await this.knex
      .table(this.table)
      .insert<unknown>(aggregates.map(this.serializer))
      .onConflict('id')
      .merge();
    return aggregates;
  };
}
