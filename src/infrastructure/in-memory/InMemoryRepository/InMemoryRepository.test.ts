import { v4 as uuidv4 } from 'uuid';

import { InMemoryRepository } from './InMemoryRepository';

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

class TestAggregateInMemoryRepository extends InMemoryRepository<TestAggregate> {
  constructor(aggregates?: ReadonlyArray<TestAggregate>) {
    super({
      aggregateName: 'TestAggregate',
      aggregates,
    });
  }
}

describe('InMemoryRepository', () => {
  describe('getById', () => {
    it('should store and retrieve an aggregate', async () => {
      const repository = new TestAggregateInMemoryRepository();
      const aggregate = testAggregateFactory();
      await repository.store(aggregate);
      expect(await repository.getById(aggregate.id)).toStrictEqual(aggregate);
    });
    it('should fail if the aggregate is not found', async () => {
      const repository = new TestAggregateInMemoryRepository();
      const id = testAggregateIdFactory();
      await expect(repository.getById(id)).rejects.toThrow(
        `Aggregate TestAggregate not found with id ${id}`,
      );
    });
  });
  describe('getByIds', () => {
    it('should store and retrieve many aggregates by id', async () => {
      const repository = new TestAggregateInMemoryRepository();
      const aggregate1 = testAggregateFactory();
      const aggregate2 = testAggregateFactory();
      const aggregate3 = testAggregateFactory();
      await repository.store(aggregate1);
      await repository.store(aggregate2);
      await repository.store(aggregate3);
      expect(
        await repository.getByIds([aggregate1.id, aggregate2.id]),
      ).toStrictEqual([aggregate1, aggregate2]);
    });
  });
  describe('findById', () => {
    it('should return an aggregate if the aggregate is found', async () => {
      const aggregate = testAggregateFactory();
      const repository = new TestAggregateInMemoryRepository([aggregate]);
      expect(await repository.findById(aggregate.id)).toStrictEqual(aggregate);
    });
    it('should return null if the aggregate is not found', async () => {
      const repository = new TestAggregateInMemoryRepository();
      expect(await repository.findById(testAggregateIdFactory())).toBeNull();
    });
  });
  describe('delete', () => {
    it('should delete an aggregate', async () => {
      const aggregate = testAggregateFactory();
      const repository = new TestAggregateInMemoryRepository([aggregate]);
      await repository.delete(aggregate.id);
      expect(await repository.findById(aggregate.id)).toBeNull();
    });
  });
  describe('deleteAll', () => {
    it('should delete multiple aggregates', async () => {
      const aggregate1 = testAggregateFactory();
      const aggregate2 = testAggregateFactory();
      const repository = new TestAggregateInMemoryRepository();
      await repository.storeAll([aggregate1, aggregate2]);
      await repository.deleteAll([aggregate1.id, aggregate2.id]);
      expect(await repository.findById(aggregate1.id)).toBeNull();
      expect(await repository.findById(aggregate2.id)).toBeNull();
    });
  });
  describe('getAll / count', () => {
    it('should include all items with deleted items', async () => {
      const aggregate1 = testAggregateFactory({});
      const aggregate2 = testAggregateFactory({});
      const repository = new TestAggregateInMemoryRepository([
        aggregate1,
        aggregate2,
      ]);
      await repository.delete(aggregate2.id);
      expect(await repository.getAll()).toStrictEqual([aggregate1]);
      expect(await repository.getAll({ withDeleted: true })).toStrictEqual([
        aggregate1,
        aggregate2,
      ]);
    });
  });
});
