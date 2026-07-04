import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "local-lead-search",
    region: "ap-southeast-1",
    framework: "nextjs",
    httpPort: 3000,
  },
});
