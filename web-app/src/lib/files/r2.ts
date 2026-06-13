import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";

const requireEnv = (name: keyof typeof env) => {
  const value = env[name];
  if (typeof value !== "string" || !value) {
    throw new Error(`${name} is not configured in this runtime.`);
  }
  return value;
};

const getClient = () =>
  new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_S3_URL"),
    credentials: {
      accessKeyId: requireEnv("R2_S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });

export async function uploadFile(
  file: File,
  path: string,
): Promise<{ url: string }> {
  const key = path ? `${path}/${file.name}` : file.name;
  const arrayBuffer = await file.arrayBuffer();

  await getClient().send(
    new PutObjectCommand({
      Bucket: requireEnv("R2_S3_BUCKET_NAME"),
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    }),
  );

  return { url: `${requireEnv("R2_URL")}/${key}` };
}
