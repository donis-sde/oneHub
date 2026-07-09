/* eslint-disable @typescript-eslint/no-explicit-any */
import * as jsonwebtoken from 'jsonwebtoken';

type ObjectValidator<P extends Record<string, any>> = (
  v: Record<string, any>,
) => v is P;

export const encode = <P extends Record<string, any>>(
  payload: Record<string, any>,
  secret: string,
  payloadValidator: ObjectValidator<P>,
): string => {
  if (payloadValidator(payload)) {
    const token = jsonwebtoken.sign(payload, secret);

    return token;
  } else {
    throw new Error('invalid_payload');
  }
};

export const verifyAndDecode = <P extends Record<string, any>>(
  jwt: string,
  secret: string,
  payloadValidator: ObjectValidator<P>,
): P => {
  const jwtVerified = jsonwebtoken.verify(jwt, secret);

  if (typeof jwtVerified === 'string') {
    throw new Error('string_jwt_unsupported');
  }

  if (payloadValidator(jwtVerified)) {
    return jwtVerified;
  } else {
    throw new Error('invalid_jwt');
  }
};
