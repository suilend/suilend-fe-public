# suilend-public/liquidator

A starting point for the Suilend community to build their own liquidator bots.
docker-compose up -d --build will start the liquidator
You must first add your private key to the environment variables in docker-compose.yml

There are 2 components to the liquidator, which communicate through redis.
There is the Dispatcher, which looks for obligations that liquidation eligible, and publishes them to a redis key. 

Then there is the worker, which looks at this redis key, and tries to liquidate those obligations.

Possible extensions/improvements
1. Right now only one liquidation can happen at a time. You could add another worker process that uses another wallet to liquidate obligations. The Dispatcher optionally publish to separate keys for each of the workers.

2. Right now the liquidations are processed in a random order. When the obligationIDs are read from redis, they are shuffled and then processed in order. In theory it might be better to process more valuable liquidations first, or positions that are more liquidatable first. 

3. Right now only obligation IDs are sent through redis, so the worker has to repull the obligation data and refresh it before it can attempt to liquidate it. It might be more efficient to passthrough a serialized version of the obligation to redis so that the worker doesn't have to repeat any work.

4. Right now the worker tries to liquidate for a fixed number of seconds, after which it gives up and moves on. You can probably be more intelligent about this logic.

5. The liquidator doesn't actually make sure that each liquidation is profitable. In theory if the slippage on Cetus is poor enough, it could lose money on liquidations.  

6. It might be useful to have multiple venues to dump assets onto in case the liquidity one venue is poor.

7. Right now the liquidations happen in the same transaction as asset swaps. However, account contention might make it such that it may sometimes be more likely that a transaction goes through if the transaction touches fewer accounts. This means at times it may be better to split up the transaction into small parts if possible.