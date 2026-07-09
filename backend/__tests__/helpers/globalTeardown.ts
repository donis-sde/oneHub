/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config } from '@jest/types';
import { getServerDiContainer } from '@/global/serverDiContainer';

require('ts-node/register');

const setup = async (
  _globalConfig: Config.GlobalConfig,
  _projectConfig: Config.ProjectConfig,
): Promise<void> => {
  const mongooseConnection = (global as any).__MONGOOSE_CONNECTION__;
  const mongod = (global as any).__MONGOD__;
  await mongooseConnection?.close();
  await mongod?.stop();
};

export default setup;
