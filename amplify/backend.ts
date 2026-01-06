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

// Configure sendContactEmail Lambda permissions
const sendContactEmailLambda = backend.sendContactEmail.resources.lambda;
sendContactEmailLambda.role?.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  })
);

// Set environment variables for the Lambda
sendContactEmailLambda.addEnvironment("REGION", "eu-central-1");
sendContactEmailLambda.addEnvironment("DATTIVOX_FROM_EMAIL", process.env.DATTIVOX_FROM_EMAIL || "info@dattico.com");
sendContactEmailLambda.addEnvironment("DATTIVOX_REPLY_TO", process.env.DATTIVOX_REPLY_TO || "info@dattico.com");
sendContactEmailLambda.addEnvironment("DATTIVOX_CONTACT_EMAIL", process.env.DATTIVOX_CONTACT_EMAIL || "info@dattico.com");

