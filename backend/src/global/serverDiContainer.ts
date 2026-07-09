import {
  ServerContainer,
  createServerRootDiContainer,
} from '@/di/serverDiContainer';

export async function getServerDiContainer(
  DB_URL?: string,
): Promise<ServerContainer> {
  if (typeof window !== 'undefined') {
    throw new Error('unsupported for frontend');
  }

  if (global.__diContainer) {
    return global.__diContainer;
  } else {
    const diContainer = await createServerRootDiContainer(DB_URL);
    global.__diContainer = diContainer;
    return diContainer;
  }
}
