import { defineFunction } from '@aws-amplify/backend';

export const sendContactEmail = defineFunction({
  name: 'sendContactEmail',
  entry: './handler.ts'
});

