#!/usr/bin/env node

import * as cdk from "@aws-cdk/core";
import { CdkCymotiveTaskStack } from "../lib/cdk-cymotive-task-stack";

const app = new cdk.App();
new CdkCymotiveTaskStack(app, "CdkCymotiveTaskStack", {});
