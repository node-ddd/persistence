import { v4 as uuidv4 } from 'uuid';
import * as Option from 'fp-ts/lib/Option';

import { InMemoryFRepository } from './InMemoryFRepository';
import * as String from 'fp-ts/lib/string';

interface TestAggregate {
  id: string;
  createdAt: Date;
  name: string;
}
const testAggregateIdFactory = (id = uuidv4()) => id;
const testAggregateFactory = ({
  id = testAggregateIdFactory(),
  createdAt = new Date('2020'),
  name = 'name',
}: Partial<TestAggregate> = {}): TestAggregate => ({ id, createdAt, name });
const errorBuilder = (message: string) => new Error(message);

class TestAggregateInMemoryFRepository extends InMemoryFRepository<
  TestAggregate,
  Error
> {
  constructor(aggregates?: ReadonlyArray<TestAggregate>) {
    super({
      aggregateName: 'TestAggregate',
      aggregates,
      eqId: String.Eq,
      errorBuilder,
    });
  }
}

describe('InMemoryFRepository', () => {
  describe('getById', () => {
    it('should store and retrieve an aggregate', async () => {
      const repository = new TestAggregateInMemoryFRepository();
      const aggregate = testAggregateFactory();
      await repository.store(aggregate)();
      expect(await repository.getById(aggregate.id)()).toStrictEqualRight(
        aggregate,
      );
    });
    it('should fail if the aggregate is not found', async () => {
      const repository = new TestAggregateInMemoryFRepository();
      const id = testAggregateIdFactory();
      expect(await repository.getById(id)()).toStrictEqualLeft(
        errorBuilder(`Aggregate TestAggregate not found with id ${id}`),
      );
    });
  });
  describe('getByIds', () => {
    it('should store and retrieve many aggregates by id', async () => {
      const repository = new TestAggregateInMemoryFRepository();
      const aggregate1 = testAggregateFactory();
      const aggregate2 = testAggregateFactory();
      const aggregate3 = testAggregateFactory();
      await repository.store(aggregate1)();
      await repository.store(aggregate2)();
      await repository.store(aggregate3)();
      expect(
        await repository.getByIds([aggregate1.id, aggregate2.id])(),
      ).toStrictEqualRight([aggregate1, aggregate2]);
    });
  });
  describe('findById', () => {
    it('should return an Option.some if the aggregate is found', async () => {
      const aggregate = testAggregateFactory();
      const repository = new TestAggregateInMemoryFRepository([aggregate]);
      expect(await repository.findById(aggregate.id)()).toStrictEqualRight(
        Option.some(aggregate),
      );
    });
    it('should return an Option.none if the aggregate is not found', async () => {
      const repository = new TestAggregateInMemoryFRepository();
      expect(
        await repository.findById(testAggregateIdFactory())(),
      ).toStrictEqualRight(Option.none);
    });
  });
  describe('delete', () => {
    it('should delete an aggregate', async () => {
      const aggregate = testAggregateFactory();
      const repository = new TestAggregateInMemoryFRepository([aggregate]);
      await repository.delete(aggregate.id)();
      expect(await repository.findById(aggregate.id)()).toStrictEqualRight(
        Option.none,
      );
    });
  });
  describe('deleteAll', () => {
    it('should delete multiple aggregates', async () => {
      const aggregate1 = testAggregateFactory();
      const aggregate2 = testAggregateFactory();
      const repository = new TestAggregateInMemoryFRepository();
      await repository.storeAll([aggregate1, aggregate2])();
      await repository.deleteAll([aggregate1.id, aggregate2.id])();
      expect(await repository.findById(aggregate1.id)()).toStrictEqualRight(
        Option.none,
      );
      expect(await repository.findById(aggregate2.id)()).toStrictEqualRight(
        Option.none,
      );
    });
  });
  describe('getAll / count', () => {
    it('should include all items with deleted items', async () => {
      const aggregate1 = testAggregateFactory({});
      const aggregate2 = testAggregateFactory({});
      const repository = new TestAggregateInMemoryFRepository([
        aggregate1,
        aggregate2,
      ]);
      await repository.delete(aggregate2.id)();
      expect(await repository.getAll()()).toStrictEqualRight([aggregate1]);
      expect(
        await repository.getAll({ withDeleted: true })(),
      ).toStrictEqualRight([aggregate1, aggregate2]);
    });
  });
});
