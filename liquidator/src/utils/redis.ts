import * as Redis from "ioredis";

export class RedisClient {
  private redisClient: Redis.Redis;
  constructor(host: string, port: number) {
    this.redisClient = new Redis.Redis(port, host);
  }

  async setObligationIds(obligationIds: string[]) {
    return await this.redisClient.set(
      "obligation_ids",
      JSON.stringify(obligationIds),
    );
  }

  async getObligationIds(): Promise<string[]> {
    const data = await this.redisClient.get("obligation_ids");
    return JSON.parse(data || "[]");
  }
}
