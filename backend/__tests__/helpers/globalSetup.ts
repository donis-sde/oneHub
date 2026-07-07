/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config } from '@jest/types';
import util from 'util';
import { exec } from 'child_process';
const promisifiedExec = util.promisify(exec);
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getServerDiContainer } from '@/global/serverDiContainer';

require('ts-node/register');

const MONGODB_VERSION = '4.4.22';

const setup = async (
  _globalConfig: Config.GlobalConfig,
  _projectConfig: Config.ProjectConfig,
): Promise<void> => {
  try {
    const mongod = await MongoMemoryServer.create({
      instance: { storageEngine: 'wiredTiger' },
      binary: {
        version: MONGODB_VERSION,
      },
    });

    (global as any).__MONGOD__ = mongod;

    const mongoUri = mongod.getUri();

    process.env.MONGODB_URI = mongoUri;
    const { mongooseConnection } = await getServerDiContainer(mongoUri);
    (global as any).__MONGOOSE_CONNECTION__ = mongooseConnection;

    const { stdout } = await promisifiedExec(
      `DB_URL=${mongoUri} yarn migrate:up`,
    );
    console.log('stdout', stdout);
  } catch (e) {
    console.error('Test Setup Error -> ', e);
  }
};

export default setup;
