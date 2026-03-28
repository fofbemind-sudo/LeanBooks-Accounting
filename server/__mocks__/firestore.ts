/**
 * In-memory Firestore mock for unit testing.
 * Supports basic collection/doc CRUD, where() chaining, orderBy, batch writes.
 */

type DocData = Record<string, any>;

// In-memory data store: collection -> docId -> data
const store: Record<string, Record<string, DocData>> = {};

let idCounter = 0;
function generateId() {
  return `mock_doc_${++idCounter}`;
}

export function resetStore() {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  idCounter = 0;
}

function getCollection(name: string) {
  if (!store[name]) store[name] = {};
  return store[name];
}

// Use a symbol to store collection name so it doesn't conflict with anything
const COL_NAME = Symbol("collectionName");

class MockDocRef {
  id: string;
  [COL_NAME]: string;

  constructor(collectionName: string, id?: string) {
    this[COL_NAME] = collectionName;
    this.id = id || generateId();
  }

  get ref() {
    return this;
  }

  async get() {
    const col = getCollection(this[COL_NAME]);
    const data = col[this.id];
    return {
      exists: !!data,
      id: this.id,
      data: () => data ? { ...data } : undefined,
      ref: this,
    };
  }

  async set(data: DocData) {
    const col = getCollection(this[COL_NAME]);
    col[this.id] = { ...data };
  }

  async update(data: DocData) {
    const col = getCollection(this[COL_NAME]);
    if (col[this.id]) {
      col[this.id] = { ...col[this.id], ...data };
    }
  }
}

class MockQuery {
  protected _queryColName: string;
  private filters: Array<{ field: string; op: string; value: any }>;
  private ordering?: { field: string; direction: string };

  constructor(
    collectionName: string,
    filters: Array<{ field: string; op: string; value: any }> = [],
    ordering?: { field: string; direction: string }
  ) {
    this._queryColName = collectionName;
    this.filters = filters;
    this.ordering = ordering;
  }

  where(field: string, op: string, value: any) {
    return new MockQuery(this._queryColName, [...this.filters, { field, op, value }], this.ordering);
  }

  orderBy(field: string, direction: string = "asc") {
    return new MockQuery(this._queryColName, this.filters, { field, direction });
  }

  async get() {
    const col = getCollection(this._queryColName);
    let docs = Object.entries(col).map(([id, data]) => ({
      id,
      data: () => ({ ...data }),
      ref: new MockDocRef(this._queryColName, id),
    }));

    // Apply filters
    for (const filter of this.filters) {
      docs = docs.filter((doc) => {
        const val = doc.data()[filter.field];
        switch (filter.op) {
          case "==":
            return val === filter.value;
          case "<=":
            return val <= filter.value;
          case ">=":
            return val >= filter.value;
          case "<":
            return val < filter.value;
          case ">":
            return val > filter.value;
          default:
            return true;
        }
      });
    }

    return {
      docs,
      forEach: (cb: (doc: any) => void) => docs.forEach(cb),
      empty: docs.length === 0,
      size: docs.length,
    };
  }
}

class MockCollectionRef extends MockQuery {
  constructor(name: string) {
    super(name);
  }

  doc(id?: string) {
    return new MockDocRef(this._queryColName, id);
  }
}

class MockBatch {
  private operations: Array<() => void> = [];

  set(ref: MockDocRef, data: DocData) {
    const colName = ref[COL_NAME];
    this.operations.push(() => {
      const col = getCollection(colName);
      col[ref.id] = { ...data };
    });
  }

  update(ref: MockDocRef, data: DocData) {
    const colName = ref[COL_NAME];
    this.operations.push(() => {
      const col = getCollection(colName);
      if (col[ref.id]) {
        col[ref.id] = { ...col[ref.id], ...data };
      }
    });
  }

  async commit() {
    for (const op of this.operations) {
      op();
    }
  }
}

export const mockDb = {
  collection: (name: string) => new MockCollectionRef(name),
  batch: () => new MockBatch(),
};

function createTimestamp(date: Date) {
  const ms = date.getTime();
  return {
    toDate: () => date,
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    // Allow numeric comparison via <= >= etc.
    valueOf: () => ms,
  };
}

export const mockTimestamp = {
  now: () => createTimestamp(new Date()),
  fromDate: (date: Date) => createTimestamp(date),
};

// Seed helper: insert a document directly into the mock store
export function seedDoc(collection: string, id: string, data: DocData) {
  const col = getCollection(collection);
  col[id] = { ...data };
}
