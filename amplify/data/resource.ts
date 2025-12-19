import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  sendContactEmail: a
    .mutation()
    .arguments({
      name: a.string().required(),
      email: a.string().required(),
      company: a.string(),
      phone: a.string(),
      message: a.string().required(),
      to: a.string(),
    })
    // Public access (no authentication required for contact form)
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function('sendContactEmail'))
    .returns(a.json()),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
  },
});


