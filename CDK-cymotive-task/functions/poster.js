const AWS = require("aws-sdk");
const s3 = new AWS.S3();

exports.handler = async (event) => {
  const report = event.report;
  console.log(event.report);
  const params = {
    Bucket: process.env.BUCKET_NAME,
    ContentType: "application/json",
    Key: `${report.vehicleId}.json`, // File name you want to save as in S3
    Body: JSON.stringify(report),
  };

  await s3.putObject(params).promise();
  return "Done";
};
