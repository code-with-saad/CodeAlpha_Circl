import crypto from 'node:crypto';

// Signed direct upload: the browser sends the file straight to Cloudinary using a
// short-lived signature, so the API secret never leaves the server and file bytes
// never pass through the serverless function (4.5MB body limit).
export function signUpload(req, res) {
  const kind = req.body?.kind === 'post' ? 'post' : 'avatar';
  const folder = `circl/${kind}s`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Params must be signed in alphabetical order.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');

  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
    timestamp,
    signature,
  });
}
