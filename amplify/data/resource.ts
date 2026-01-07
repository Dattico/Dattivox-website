import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { sendContactEmail } from '../function/sendContactEmail/resource';

const schema = a.schema({
  ContactEmailResponse: a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    messageId: a.string(),
  }),
  
  // Query type required by AppSync - simple health check
  health: a
    .query()
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function('health')),
  
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
    .handler(a.handler.function(sendContactEmail))
    .returns(a.ref('ContactEmailResponse')),
})
.authorization((allow) => [allow.resource(sendContactEmail)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
  },
});


