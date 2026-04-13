import { createClient } from "microcms-js-sdk";

if (!process.env.MICROCMS_SERVICE_DOMAIN) {
  console.warn("MICROCMS_SERVICE_DOMAIN is not set. Using mock data.");
}

export const client = process.env.MICROCMS_SERVICE_DOMAIN
  ? createClient({
      serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN,
      apiKey: process.env.MICROCMS_API_KEY || "",
    })
  : null;
