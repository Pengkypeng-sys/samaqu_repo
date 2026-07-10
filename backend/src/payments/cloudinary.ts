import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export function configureCloudinary(config: ConfigService) {
  cloudinary.config({
    cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
    api_key: config.get('CLOUDINARY_API_KEY'),
    api_secret: config.get('CLOUDINARY_API_SECRET'),
  });
  return cloudinary;
}

export async function uploadBuffer(buffer: Buffer, folder = 'samaqu/bukti-bayar'): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (err, result) => {
        if (err || !result) return reject(err);
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}
