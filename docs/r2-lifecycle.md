# Cloudflare R2 CORS and Lifecycle Rules

Astrylix stores audio originals and stems in a private R2 bucket, and generated 128 kbps preview MP3s and cover art in a public R2 bucket.

## 1. R2 Public Bucket HTTP Range Requests

Cloudflare R2 custom domains and `<pub-bucket>.r2.dev` domains natively support HTTP range requests (`Range: bytes=0-1023`). This is essential for:
1. Audio seek bar scrubbing in `<audio>` elements across desktop and mobile browsers.
2. Fast first-bytes file magic sniffing without downloading full audio files.

Ensure your public bucket custom domain (or R2 dev domain) has Range headers enabled in Cloudflare:
- Allowed Headers: `Range`, `Content-Type`, `Origin`, `Accept`, `Authorization`
- Exposed Headers: `Content-Range`, `Content-Length`, `ETag`, `Accept-Ranges`
- Allowed Methods: `GET`, `HEAD`, `OPTIONS`

## 2. Incomplete Multipart Upload Lifecycle Rule

When large audio files (WAV or multi-track stem ZIP archives) are uploaded, multipart uploads are initialized. If a client disconnects or abandons an upload, incomplete parts could persist indefinitely in R2 storage.

Astrylix workers run periodic draft cleanup (`cleanupAbandonedDrafts`), but Cloudflare R2 bucket lifecycle rules should also be configured via the Cloudflare dashboard or AWS CLI:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com \
  --bucket astrylix-private \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "AbortIncompleteMultipartUploadsAfter1Day",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "AbortIncompleteMultipartUpload": {
          "DaysAfterInitiation": 1
        }
      }
    ]
  }'
```

