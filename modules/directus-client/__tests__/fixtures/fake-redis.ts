export interface FakeRedisRecord {
  value: string;
  expiresAt?: number;
}

export class FakeRedis {
  readonly records = new Map<string, FakeRedisRecord>();
  readonly setCalls: Array<{
    key: string;
    value: string;
    arguments_: Array<string | number>;
  }> = [];
  readonly evalCalls: Array<{ script: string; key: string; owner: string }> = [];
  beforeEval?: () => void;
  beforeLeaseSet?: () => void;
  failNextResultPublication = false;

  private expire(key: string): FakeRedisRecord | undefined {
    const record = this.records.get(key);
    if (record?.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      this.records.delete(key);
      return undefined;
    }
    return record;
  }

  async get(key: string): Promise<string | null> {
    return this.expire(key)?.value ?? null;
  }

  async set(key: string, value: string, ...arguments_: Array<string | number>): Promise<unknown> {
    this.setCalls.push({ key, value, arguments_ });
    if (arguments_.includes("NX")) this.beforeLeaseSet?.();
    if (this.failNextResultPublication && arguments_[0] === "EX") {
      this.failNextResultPublication = false;
      throw new Error("Redis publication unavailable");
    }
    if (arguments_.includes("NX") && this.expire(key)) return null;
    const expiryIndex = arguments_.indexOf("EX");
    const ttl = expiryIndex >= 0 ? Number(arguments_[expiryIndex + 1]) : undefined;
    this.records.set(key, {
      value,
      ...(ttl !== undefined ? { expiresAt: Date.now() + ttl * 1_000 } : {})
    });
    return "OK";
  }

  async eval(script: string, _keyCount: number, key: string, owner: string): Promise<number> {
    this.evalCalls.push({ script, key, owner });
    this.beforeEval?.();
    this.beforeEval = undefined;
    const record = this.expire(key);
    if (record?.value !== owner) return 0;
    this.records.delete(key);
    return 1;
  }

  delete(key: string): void {
    this.records.delete(key);
  }

  has(key: string): boolean {
    return this.expire(key) !== undefined;
  }
}
