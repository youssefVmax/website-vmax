import { Request } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { ApiError } from './error-handler';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

// Define allowed file types
const ALLOWED_FILE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Configure storage
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: DestinationCallback
  ) => {
    let uploadPath = 'uploads/';
    
    // Set subdirectory based on file type or route
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('application/')) {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'others/';
    }
    
    cb(null, uploadPath);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: FileNameCallback
  ) => {
    const ext = ALLOWED_FILE_TYPES[file.mimetype] || path.extname(file.originalname).substring(1);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_FILE_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type ${file.mimetype} not allowed`));
  }
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Middleware for handling single file upload
export const singleFileUpload = (fieldName: string) => {
  return (req: Request, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'File size exceeds the 5MB limit'));
          }
          return next(new ApiError(400, err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for handling multiple file uploads
export const multiFileUpload = (fieldName: string, maxCount: number = 5) => {
  return (req: Request, res: any, next: any) => {
    upload.array(fieldName, maxCount)(req, res, (err: any) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'One or more files exceed the 5MB limit'));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ApiError(400, `Maximum ${maxCount} files allowed`));
          }
          return next(new ApiError(400, err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for handling multiple fields with multiple files
export const multiFieldUpload = (fields: Array<{ name: string; maxCount?: number }>) => {
  return (req: Request, res: any, next: any) => {
    upload.fields(fields)(req, res, (err: any) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'One or more files exceed the 5MB limit'));
          }
          return next(new ApiError(400, err.message));
        }
        return next(err);
      }
      next();
    });
  };
};

// Function to delete a file
export const deleteFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const fs = require('fs');
    fs.unlink(filePath, (err: NodeJS.ErrnoException | null) => {
      if (err) {
        logger.error(`Error deleting file ${filePath}:`, err);
        resolve(false);
      } else {
        logger.info(`File ${filePath} deleted successfully`);
        resolve(true);
      }
    });
  });
};

// Function to get file URL
export const getFileUrl = (req: Request, filePath: string): string => {
  if (!filePath) return '';
  
  // If it's already a URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Otherwise, construct the full URL
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  
  // Remove the 'public' prefix if present (common in Express static file serving)
  const cleanPath = filePath.replace(/^public[\\/]?/, '').replace(/\\/g, '/');
  
  return `${protocol}://${host}/${cleanPath}`;
};

// Function to validate file type
export const validateFileType = (file: Express.Multer.File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

// Function to validate file size
export const validateFileSize = (file: Express.Multer.File, maxSizeInBytes: number): boolean => {
  return file.size <= maxSizeInBytes;
};

export default upload;
