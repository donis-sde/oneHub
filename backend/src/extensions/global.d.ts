import { ServerContainer } from '@/di/serverDiContainer';

declare global {
  // eslint-disable-next-line no-var
  declare var __diContainer: ServerContainer;
  // eslint-disable-next-line no-var
  declare var __MONGO_URI__: string;
}
