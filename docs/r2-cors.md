# Cloudflare R2 Bucket CORS Configuration

This document specifies the recommended Cross-Origin Resource Sharing (CORS) rules for Beatbazaar Cloudflare R2 buckets.

## Overview

Beatbazaar operates two distinct Cloudflare R2 storage buckets:

1. **Private Bucket (`beatbazaar-private`)**:
   - Stores original uncompressed audio files (WAV, high-bitrate MP3), stems ZIP archives, and generated license agreements (PDF).
   - Never exposed directly to the public internet or through a custom public domain.
   - Uploads go directly from the client browser using presigned PUT URLs.
   - Downloads occur via short-lived presigned GET URLs after purchase and authentication verification.

2. **Public Bucket (`beatbazaar-public`)**:
   - Stores producer avatar images, beat cover artwork, and watermarked low-bitrate MP3 preview streams.
   - Served behind a Cloudflare custom domain with aggressive caching headers.

---

## 1. Private Bucket CORS Rule

Applied to `beatbazaar-private`:

```json
[
  {
    "AllowedOrigins": [
      "https://your-confirmed-domain.example",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-MD5",
      "Content-Disposition",
      "x-amz-*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Disposition"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Explanation of Private Rules
- **AllowedOrigins**: Narrowly scoped strictly to the application origin. Wildcard (`*`) is explicitly prohibited.
- **AllowedMethods**: `PUT` is necessary for direct presigned client uploads. `GET` and `HEAD` support authorized file verification and range queries.
- **AllowedHeaders**: Enables headers sent during chunked and presigned S3 PUT requests.
- **ExposeHeaders**: Allows the upload client to verify ETags and checksums after completion.

---

## 2. Public Bucket CORS Rule

Applied to `beatbazaar-public`:

```json
[
  {
    "AllowedOrigins": [
      "https://your-confirmed-domain.example",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Range"
    ],
    "ExposeHeaders": [
      "Content-Range",
      "Content-Length",
      "ETag",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

### Explanation of Public Rules
- Supports HTTP Byte-Range requests for seamless audio seeking on watermarked track previews.
- Caches preflight responses for 24 hours (`MaxAgeSeconds: 86400`).

---

## Applying Rules via Wrangler CLI

You can apply these rules using Cloudflare Wrangler:

```bash
# Apply to private bucket
wrangler r2 bucket cors set beatbazaar-private --file ./docs/cors-private.json

# Apply to public bucket
wrangler r2 bucket cors set beatbazaar-public --file ./docs/cors-public.json
```
