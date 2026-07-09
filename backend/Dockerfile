FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn

# ^prevent rebuild package every time

COPY . .

RUN yarn build

CMD [ "yarn", "start" ]