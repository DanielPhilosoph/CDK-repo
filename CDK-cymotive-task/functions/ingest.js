const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const dynamoDbClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-3" });

exports.handler = async (event) => {
  console.log(event.Records[0].s3.object.key);

  const params = {
    Bucket: "cdk-cymotive-task", // bucket name,
    Key: `${event.Records[0].s3.object.key}`, // path to the object you're looking for
  };

  const data = await s3.getObject(params).promise();

  const paramsToDynamoDB = {
    Item: JSON.parse(data.Body.toString()),
    TableName: "ids-table-cymotive-task",
  };
  try {
    await dynamoDbClient.put(paramsToDynamoDB).promise();
  } catch (e) {
    console.log(e);
  }

  return "Done";
};
