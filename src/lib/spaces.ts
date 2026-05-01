import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectAclCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

export type ObjectVisibility = "public" | "private"

export type SpacesCredentials = {
  accessKeyId: string
  secretAccessKey: string
  bucketUrl: string
}

export type ParsedSpacesBucket = {
  bucket: string
  region: string
  endpoint: string
  publicBaseUrl: string
}

export type SpaceNode = {
  key: string
  name: string
  type: "folder" | "file"
  size: number
  lastModified?: Date
}

export function parseSpacesBucketUrl(rawUrl: string): ParsedSpacesBucket {
  const normalized = rawUrl.trim().startsWith("http")
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`

  const url = new URL(normalized)
  const parts = url.hostname.split(".")

  if (parts.length < 4 || parts[2] !== "digitaloceanspaces" || parts[3] !== "com") {
    throw new Error("Bucket URL gecersiz. Ornek: https://bucket.sgp1.digitaloceanspaces.com")
  }

  const [bucket, region] = parts

  if (!bucket || !region) {
    throw new Error("Bucket URL icinde bucket veya region bulunamadi")
  }

  return {
    bucket,
    region,
    endpoint: `https://${region}.digitaloceanspaces.com`,
    publicBaseUrl: `https://${bucket}.${region}.digitaloceanspaces.com`,
  }
}

/**
 * Dev modunda window.fetch intercept ile CORS bypass:
 *
 * 1. SDK her zaman gerçek endpoint'e imzalar  →  host: sgp1.digitaloceanspaces.com
 * 2. fetch intercept isteği Vite proxy'ye yönlendirir:
 *    https://sgp1.digitaloceanspaces.com/bucket/key
 *    → http://localhost:<port>/spaces-proxy/sgp1.digitaloceanspaces.com/bucket/key
 * 3. Proxy tüm header'ları (Authorization dahil) koruyarak gerçek host'a iletir
 * 4. DigitalOcean host: sgp1.digitaloceanspaces.com görür → imza doğrulanır ✓
 *
 * Production: fetch intercept yok, direkt endpoint kullanılır; Spaces CORS kuralı gereklidir.
 */
if (import.meta.env.DEV) {
  const _originalFetch = window.fetch.bind(window)
  window.fetch = function devSpacesProxyFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : String(input)

    if (url.includes('.digitaloceanspaces.com')) {
      const { hostname, pathname, search } = new URL(url)
      const proxied = `${location.origin}/spaces-proxy/${hostname}${pathname}${search}`

      if (input instanceof Request) {
        return _originalFetch(proxied, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          credentials: 'omit',
          mode: 'same-origin',
          // @ts-expect-error duplex required for streaming request bodies per Fetch spec
          duplex: 'half',
        })
      }

      return _originalFetch(proxied, init)
    }

    return _originalFetch(input, init)
  }
}

export function createSpacesClient(credentials: SpacesCredentials): {
  client: S3Client
  parsed: ParsedSpacesBucket
} {
  const parsed = parseSpacesBucketUrl(credentials.bucketUrl)

  // Always use the real endpoint — SDK signs with the correct host.
  // In dev the fetch intercept above re-routes HTTP traffic through the proxy.
  const client = new S3Client({
    region: parsed.region,
    endpoint: parsed.endpoint,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    // Dev proxy is simpler with path-style; production should use bucket host style
    // so Spaces can apply bucket-level CORS headers correctly.
    forcePathStyle: import.meta.env.DEV,
  })

  return { client, parsed }
}

/**
 * Applies a permissive CORS policy to the bucket so the app can be used
 * from any origin (including GitHub Pages). Safe to call on every login —
 * it is idempotent.
 */
export async function applyBucketCors(client: S3Client, bucket: string): Promise<void> {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  )
}

function sortNodes(nodes: SpaceNode[]): SpaceNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1
    }

    return a.name.localeCompare(b.name)
  })
}

export async function listNodes(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<SpaceNode[]> {
  const output = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      Delimiter: "/",
    })
  )

  const folders: SpaceNode[] = (output.CommonPrefixes ?? [])
    .map((item) => item.Prefix)
    .filter((item): item is string => Boolean(item))
    .map((folderPrefix) => {
      const trimmed = folderPrefix.endsWith("/")
        ? folderPrefix.slice(0, -1)
        : folderPrefix
      const name = trimmed.split("/").pop() ?? folderPrefix

      return {
        key: folderPrefix,
        name,
        type: "folder",
        size: 0,
      }
    })

  const files: SpaceNode[] = (output.Contents ?? [])
    .filter((item) => {
      if (!item.Key) return false
      if (item.Key === prefix) return false
      return !item.Key.endsWith("/")
    })
    .map((item) => {
      const key = item.Key ?? ""
      const name = key.split("/").pop() ?? key

      return {
        key,
        name,
        type: "file",
        size: item.Size ?? 0,
        lastModified: item.LastModified,
      }
    })

  return sortNodes([...folders, ...files])
}

export async function uploadFiles(
  client: S3Client,
  bucket: string,
  prefix: string,
  files: File[],
  visibility: ObjectVisibility = "private"
): Promise<void> {
  for (const file of files) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}${file.name}`,
        Body: file,
        ContentType: file.type || "application/octet-stream",
        ACL: visibility === "public" ? "public-read" : "private",
      })
    )
  }
}

export async function createFolder(
  client: S3Client,
  bucket: string,
  prefix: string,
  folderName: string
): Promise<void> {
  const cleaned = folderName.trim().replaceAll("\\", "/")
  if (!cleaned) {
    throw new Error("Klasor adi bos olamaz")
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}${cleaned.replace(/\/+$/g, "")}/`,
      Body: "",
    })
  )
}

export async function deleteFile(
  client: S3Client,
  bucket: string,
  key: string
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
}

async function listAllKeys(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const output = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    for (const item of output.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key)
      }
    }

    continuationToken = output.NextContinuationToken
  } while (continuationToken)

  return keys
}

export async function deleteFolder(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<number> {
  const keys = await listAllKeys(client, bucket, prefix)

  if (keys.length === 0) {
    return 0
  }

  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
        },
      })
    )
  }

  return keys.length
}

function encodeKeyForCopySource(key: string): string {
  return encodeURIComponent(key).replaceAll("%2F", "/")
}

export async function renameFile(
  client: S3Client,
  bucket: string,
  sourceKey: string,
  targetKey: string
): Promise<void> {
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: targetKey,
      CopySource: `/${bucket}/${encodeKeyForCopySource(sourceKey)}`,
    })
  )

  await deleteFile(client, bucket, sourceKey)
}

export async function renameFolder(
  client: S3Client,
  bucket: string,
  sourcePrefix: string,
  targetPrefix: string
): Promise<number> {
  const keys = await listAllKeys(client, bucket, sourcePrefix)

  for (const sourceKey of keys) {
    const suffix = sourceKey.slice(sourcePrefix.length)
    const targetKey = `${targetPrefix}${suffix}`

    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: targetKey,
        CopySource: `/${bucket}/${encodeKeyForCopySource(sourceKey)}`,
      })
    )
  }

  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
        },
      })
    )
  }

  return keys.length
}

function hasTransformToString(body: unknown): body is { transformToString: () => Promise<string> } {
  return typeof body === "object" && body !== null && "transformToString" in body
}

export async function readTextFile(
  client: S3Client,
  bucket: string,
  key: string
): Promise<string> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )

  if (!response.Body) {
    return ""
  }

  if (hasTransformToString(response.Body)) {
    return response.Body.transformToString()
  }

  if (response.Body instanceof Blob) {
    return response.Body.text()
  }

  if (response.Body instanceof ReadableStream) {
    return new Response(response.Body).text()
  }

  throw new Error("Dosya icerigi okunamadi")
}

export async function writeTextFile(
  client: S3Client,
  bucket: string,
  key: string,
  content: string,
  visibility: ObjectVisibility = "private"
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: "text/plain; charset=utf-8",
      ACL: visibility === "public" ? "public-read" : "private",
    })
  )
}

export async function getObjectVisibility(
  client: S3Client,
  bucket: string,
  key: string
): Promise<ObjectVisibility> {
  const acl = await client.send(
    new GetObjectAclCommand({
      Bucket: bucket,
      Key: key,
    })
  )

  const isPublic = (acl.Grants ?? []).some((grant) => {
    const granteeUri = grant.Grantee?.URI ?? ""
    const isAllUsersGroup =
      granteeUri === "http://acs.amazonaws.com/groups/global/AllUsers" ||
      granteeUri === "https://acs.amazonaws.com/groups/global/AllUsers"

    return isAllUsersGroup && grant.Permission === "READ"
  })

  return isPublic ? "public" : "private"
}

export function toPublicObjectUrl(publicBaseUrl: string, key: string): string {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${publicBaseUrl}/${encodedKey}`
}
