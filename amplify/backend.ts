import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { sendContactEmail } from './function/sendContactEmail/resource';
import { health } from './function/health/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export const backend = defineBackend({
  data,
  sendContactEmail,
  health,
});

// Configure sendContactEmail Lambda permissions for SESv2
const sendContactEmailLambda = backend.sendContactEmail.resources.lambda;
sendContactEmailLambda.role?.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "ses:SendEmail",
      "ses:SendRawEmail",
      "sesv2:SendEmail",
      "sesv2:SendBulkEmail"
    ],
    resources: ["*"],
  })
);

