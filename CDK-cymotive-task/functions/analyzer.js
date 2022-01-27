const AWS = require("aws-sdk");
const dynamoDbClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-3" });

exports.handler = async (event, content) => {
  console.log(event);
  if (event.request === "/numberofanomalies") {
    // numberofanomalies

    const data = await dynamoDbClient
      .scan({ TableName: process.env.TABLE_NAME })
      .promise();
    let counter = 0;
    data.Items.forEach((record) => {
      Object.keys(record.signalsPerMinute).forEach((signal) => {
        const sum = record["signalsPerMinute"][signal].sum;
        const isValid =
          sum > record["signalsPerMinute"][signal].acceptableMinValue &&
          sum < record["signalsPerMinute"][signal].acceptableMaxValue;
        if (record["signalsPerMinute"][signal].canId === 11) {
          if (!isValid) counter++;
        } else if (record["signalsPerMinute"][signal].canId === 46) {
          if (!isValid) counter++;
        } else if (record["signalsPerMinute"][signal].canId === 80) {
          if (!isValid) counter++;
        }
      });
    });
    return { status: 200, counter };
  } else if (event.request === "/numberofreports") {
    // numberofreports

    const count = await dynamoDbClient
      .scan({ TableName: "ids-table-cymotive-task", Select: "COUNT" })
      .promise();
    return { status: 200, numberOfReports: count };
  } else if (event.request === "/numberofvehicles") {
    // numberofvehicles

    const data = await dynamoDbClient
      .scan({ TableName: "ids-table-cymotive-task" })
      .promise();
    const map = {};
    data.Items.forEach((record) => {
      if (!Object.keys(map).includes(record.vehicleId)) {
        map[record.vehicleId] = 1;
      }
    });
    return { status: 200, numberOfVehicles: Object.keys(map).length };
  } else {
    return "Not here :D";
  }
};
