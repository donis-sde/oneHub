/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import crypto from 'crypto';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.POST,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.CREATE_EXTERNAL_ADMIN_FOR_EU,
);

const generatePassword = (): string => {
  const specialChars = '!@()_+';
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';

  // Select one character from each required type
  const specialChar =
    specialChars[Math.floor(Math.random() * specialChars.length)];
  const lowerChar = lowerChars[Math.floor(Math.random() * lowerChars.length)];
  const upperChar = upperChars[Math.floor(Math.random() * upperChars.length)];
  const digitChar = digits[Math.floor(Math.random() * digits.length)];

  // Remove the selected characters from the list of all possible characters
  const allChars = lowerChars + upperChars + digits + specialChars;
  let remainingChars = allChars
    .replace(specialChar, '')
    .replace(lowerChar, '')
    .replace(upperChar, '')
    .replace(digitChar, '');

  // Select additional random characters from the remaining characters
  const additionalChars = [];
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * remainingChars.length);
    additionalChars.push(remainingChars[randomIndex]);
  }

  // Combine the characters ensuring the start with an uppercase and end with a special char
  const passwordChars = [
    upperChar,
    ...additionalChars,
    digitChar,
    specialChar,
    lowerChar,
  ];

  // Shuffle the middle part of the password characters (excluding the first and last characters)
  for (let i = 1; i < passwordChars.length - 2; i++) {
    const j = Math.floor(Math.random() * (passwordChars.length - 3)) + 1;
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      const {
        tenantID,
        firstName,
        watiInitial,
        lastName,
        frontendDomain,
        backendDomain,
        encodedPassword,
      } = req.body;
      const adminEmail = `${watiInitial}@clare.ai`;
      const password = encodedPassword; // generatePassword();
      const SLACK_CHANNEL_EMAIL = process.env.SLACK_CHANNEL_EMAIL;

      const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY as string;

      async function sendSlackMessage(
        username: string,
        url: string,
        content: string,
      ): Promise<boolean> {
        const api_url = 'https://api.mailgun.net/v3/mg.wati.io/messages';
        const subject = url;
        const to = SLACK_CHANNEL_EMAIL;
        const from = 'support@wati.io';

        const payload = new URLSearchParams();
        payload.append('subject', subject);
        payload.append('from', from);
        payload.append('to', to);
        payload.append('text', `'${url}' by ${username}`);

        try {
          const auth =
            'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
          const response = await fetch(api_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: auth,
            },
            body: payload,
          });

          if (response.status === 200) {
            console.log('Notification sent to Slack successfully');
            return true;
          } else {
            console.log('Response on sending Slack message', response.status);
            return false;
          }
        } catch (error) {
          console.error('Error sending Slack message:', error);
          return false;
        }
      }

      async function sendEmail(
        username: string,
        url: string,
        content: string,
      ): Promise<boolean> {
        const api_url = 'https://api.mailgun.net/v3/mg.wati.io/messages';
        const subject = url;
        const to = username;
        const from = 'support@wati.io';

        const payload = new URLSearchParams();
        payload.append('subject', subject);
        payload.append('from', from);
        payload.append('to', to);
        payload.append('text', content);

        try {
          const auth =
            'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
          const response = await fetch(api_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: auth,
            },
            body: payload,
          });

          if (response.status === 200) {
            console.log('Credentials sent to email successfully');
            return true;
          } else {
            console.log('Response on sending email', response.status);
            return false;
          }
        } catch (error) {
          console.error('Error sending email:', error);
          return false;
        }
      }

      const userLogin = async (
        tenantID: string,
        email: string,
        firstName: string,
        lastName: string,
        password: string,
        confirmPassword: string,
        domainApi: string,
      ) => {
        try {
          const ts = Math.floor(Date.now() / 1000);
          const secretKey = process.env.CLARE_SECRET_KEY || '';
          const keyString = `${email}:${ts}:${secretKey}`;
          const md5Hash = crypto
            .createHash('md5')
            .update(keyString)
            .digest('hex')
            .toUpperCase();
          const domain = await formatDomainApiUrl(domainApi);
          const roles = 'EXTERNAL_ADMINISTRATOR';
          // const url = `http://localhost:5000/local/api/v1/accounts/createLogin?email=${email}&timestamp=${ts}&code=${md5Hash}&roles=${roles}&password=${password}`;
          const url = `${domain}/api/v1/accounts/createLogin?email=${email}&timestamp=${ts}&code=${md5Hash}&roles=${roles}&password=${password}&firstName=${encodeURIComponent(
            firstName,
          )}&lastName=${encodeURIComponent(lastName)}`;
          console.log('Calling API:', url);
          const data = {
            email,
            firstName,
            lastName,
            password,
            confirmPassword,
            isTermsAgreed: true,
          };

          const profileFetch = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const responseBody = await profileFetch.json();
          console.log('Response on calling API:', responseBody);
          return responseBody;
        } catch (error) {
          console.error('Error:', error);
        }
      };

      const formatDomainApiUrl = async (domainApi: string) => {
        if (domainApi && domainApi.length > 0) {
          if (!/^https?:\/\//i.test(domainApi)) {
            domainApi = 'https://' + domainApi;
          }
        }
        return domainApi;
      };

      const registerAccount = async (
        tenantID: string,
        firstName: string,
        adminEmail: string,
        lastName: string,
        password: string,
        confirmPassword: string,
      ) => {
        const domainApi = backendDomain;
        const domainFe = frontendDomain;
        const profile = await userLogin(
          tenantID,
          adminEmail,
          firstName,
          lastName,
          password,
          confirmPassword,
          domainApi,
        );

        if (profile.result) {
          await sendSlackMessage(
            adminEmail,
            `New account registered for domain ${domainFe}`,
            `Admin Email: ${adminEmail}\n FE Domain URL: ${domainFe}`,
          );
          await sendEmail(
            adminEmail,
            `Your account details for domain ${domainFe}`,
            `Congratulations, you are registered as an External admin\n\nYour Credentials for the domain are given below.\nLogin URL: https://${domainFe}\nUsername: ${adminEmail}\nPassword: ${decodeURIComponent(
              password,
            )}\n\nThanks!`,
          );

          return { profile };
        } else {
          console.error('Error:', profile.error);
          return profile;
        }
      };

      try {
        const result = await registerAccount(
          tenantID,
          firstName,
          adminEmail,
          lastName,
          password,
          password,
        );

        res.status(200).json(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(400).json({ result: error });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
