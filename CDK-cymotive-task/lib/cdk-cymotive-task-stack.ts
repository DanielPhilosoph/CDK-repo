import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as s3 from "@aws-cdk/aws-s3";
import {
  S3EventSource,
  ApiEventSource,
} from "@aws-cdk/aws-lambda-event-sources";
import {
  AnyPrincipal,
  Effect,
  PolicyStatement,
  Policy,
} from "@aws-cdk/aws-iam";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkCymotiveTaskStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //? ----------------- create new services ---------------------------------
    // Create s3 bucket
    const bucket = new s3.Bucket(this, "cdk-cymotive-task", {
      bucketName: "cdk-cymotive-task",
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //Dynamodb table definition
    const table = new dynamodb.Table(this, "ids-table-cdk", {
      partitionKey: { name: "vehicleId", type: dynamodb.AttributeType.STRING },
    });

    // lambda function
    //? poster
    const porterLambda = new lambda.Function(this, "porter-cdk-cymotive-task", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions"),
      handler: "poster.handler",
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // lambda function
    //? ingest
    const ingestLambda = new lambda.Function(this, "ingest-cdk-cymotive-task", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("functions"),
      handler: "ingest.handler",
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    });

    // lambda function
    //? analyzer
    const analyzerLambda = new lambda.Function(
      this,
      "analyzer-cdk-cymotive-task",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset("functions"),
        handler: "analyzer.handler",
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    //? ----------------- policies and permissions ---------------------------------

    // create a policy statement - //? For s3 bucket
    const s3_allow_all_policy_s3 = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new AnyPrincipal()],
      actions: ["s3:*"],
      resources: [`${bucket.bucketArn}/*`, `${bucket.bucketArn}`],
    });

    // create a policy statement - //? For lambda function
    const s3_allow_all_policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:*"],
      resources: [`${bucket.bucketArn}/*`, `${bucket.bucketArn}`],
    });

    // create a policy statement
    const dynamodb_allow_all_policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["dynamodb:*"],
      resources: [`${table.tableArn}`, `${table.tableArn}/*`],
    });

    // Create policies to s3
    const s3BucketPolicyS3 = new s3.BucketPolicy(this, "S3BucketPolicy", {
      bucket: bucket,
    });

    s3BucketPolicyS3.document.addStatements(s3_allow_all_policy_s3);

    // Grant lambda all dynamodb permissions
    ingestLambda.role?.attachInlinePolicy(
      new Policy(this, " dynamodb-allow-all-policy", {
        statements: [dynamodb_allow_all_policy],
      })
    );

    analyzerLambda.role?.attachInlinePolicy(
      new Policy(this, " s3_dynamodb_allow_all", {
        statements: [dynamodb_allow_all_policy, s3_allow_all_policy],
      })
    );

    // Grant permissions
    table.grantReadWriteData(porterLambda);
    bucket.grantPut(porterLambda);

    //? ----------------- API and routes ---------------------------------
    // create the API Gateway with one method and path
    const api = new apigw.RestApi(this, "idsgateway-cdk", {
      deployOptions: {
        stageName: "api",
      },
      defaultCorsPreflightOptions: {
        /**
         * The allow rules are a bit relaxed.
         * I would strongly advise you to narrow them down in your applications.
         */
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        allowCredentials: true,
      },
    });

    //? POST /
    api.root.addMethod("POST", new apigw.LambdaIntegration(porterLambda));

    //? GET /numberofanomalies
    const numberOfAnomalies = api.root.addResource("numberofanomalies");
    numberOfAnomalies.addMethod(
      "GET",
      new apigw.LambdaIntegration(analyzerLambda)
    );

    //? GET /numberofreports
    const numberOfReports = api.root.addResource("numberofreports");
    numberOfReports.addMethod(
      "GET",
      new apigw.LambdaIntegration(analyzerLambda)
    );

    //? GET /numberofvehicles
    const numberOfVehicles = api.root.addResource("numberofvehicles");
    numberOfVehicles.addMethod(
      "GET",
      new apigw.LambdaIntegration(analyzerLambda)
    );

    //? Log the url to API
    new cdk.CfnOutput(this, "HTTP API URL", {
      value: api.url ?? "Something went wrong with the deploy",
    });

    //? -------------------- Triggers ------------------------------------

    //
    const s3PutEventSource = new S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED_PUT],
    });

    ingestLambda.addEventSource(s3PutEventSource);
  }
}
