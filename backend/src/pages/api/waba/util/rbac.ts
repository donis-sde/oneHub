import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';

export const adminPostOnly = createRbacMiddleware(
  [
    {
      roles: [Role.ADMIN],
      httpMethod: HttpMethod.POST,
    },
  ],
  BackofficeFeature.META_REMOVE_CREDIT_LINE,
);
