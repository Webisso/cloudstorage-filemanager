import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3"

function parseBucketUrl(raw) {
  const normalized = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`
  const url = new URL(normalized)
  const parts = url.hostname.split(".")

  if (parts.length < 4 || parts[2] !== "digitaloceanspaces" || parts[3] !== "com") {
    throw new Error("Invalid SPACES_BUCKET_URL. Example: https://bucket.sgp1.digitaloceanspaces.com")
  }

  const [bucket, region] = parts
  if (!bucket || !region) {
    throw new Error("Could not parse bucket/region from SPACES_BUCKET_URL")
  }

  return {
    bucket,
    region,
    endpoint: `https://${region}.digitaloceanspaces.com`,
  }
}

async function main() {
  const accessKeyId = process.env.SPACES_ACCESS_KEY_ID
  const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY
  const bucketUrl = process.env.SPACES_BUCKET_URL
  const origin = process.env.SPACES_CORS_ORIGIN || "https://webisso.github.io"

  if (!accessKeyId || !secretAccessKey || !bucketUrl) {
    throw new Error(
      "Missing env vars. Required: SPACES_ACCESS_KEY_ID, SPACES_SECRET_ACCESS_KEY, SPACES_BUCKET_URL"
    )
  }

  const parsed = parseBucketUrl(bucketUrl)

  const client = new S3Client({
    region: parsed.region,
    endpoint: parsed.endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  })

  await client.send(
    new PutBucketCorsCommand({
      Bucket: parsed.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [origin],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Length"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  )

  console.log(`CORS policy applied to bucket: ${parsed.bucket}`)
  console.log(`Allowed origin: ${origin}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
