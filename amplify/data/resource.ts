import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  ContactEmailResponse: a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    messageId: a.string(),
  }),
  
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
    .returns(a.ref('ContactEmailResponse')),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
  },
});


