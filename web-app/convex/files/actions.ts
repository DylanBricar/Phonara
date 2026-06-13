"use node";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v } from "convex/values";
import { action } from "@convex/_generated/server";
import { requireAuth } from "@convex/auth/config";
import { orgAction } from "@convex/auth/functions";
import {
  throwConfigurationError,
  throwValidationError,
} from "@convex/utils/errors";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const getR2Env = () => {
  const endpoint = process.env.R2_S3_URL;
  const accessKeyId = process.env.R2_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_S3_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_S3_BUCKET_NAME;
  const publicUrl = process.env.R2_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throwConfigurationError("R2 upload environment is not configured");
  }

  return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl };
};

const getClient = () => {
  const env = getR2Env();
  return new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    forcePathStyle: true,
  });
};

const validateImage = (mimeType: string, bytes: Uint8Array) => {
  if (!mimeType.startsWith("image/")) {
    throwValidationError("Invalid file (only images are allowed)");
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throwValidationError("File too large (max 2mb)");
  }
};

const uploadBase64Image = async (args: {
  base64: string;
  fileName: string;
  mimeType: string;
  path: string;
}) => {
  const env = getR2Env();
  const bytes = Buffer.from(args.base64, "base64");
  validateImage(args.mimeType, bytes);

  const key = args.path ? `${args.path}/${args.fileName}` : args.fileName;
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: key,
      Body: bytes,
      ContentType: args.mimeType,
    }),
  );

  return `${env.publicUrl}/${key}`;
};

export const uploadOrgImage = orgAction({
  roles: ["owner", "admin"],
  args: {
    base64: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    return uploadBase64Image({
      base64: args.base64,
      fileName: args.fileName,
      mimeType: args.mimeType,
      path: `orgs/${args.organizationId}`,
    });
  },
});

export const uploadUserImage = action({
  args: {
    base64: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const { session } = await requireAuth(ctx);
    return uploadBase64Image({
      base64: args.base64,
      fileName: args.fileName,
      mimeType: args.mimeType,
      path: `users/${session.user.id}`,
    });
  },
});
