import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { ApiError } from './error-handler';

// Define File interface for file uploads (compatible with Next.js file handling)
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

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
  'text/csv': 'csv'
};

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// File validation functions
export const isValidFileType = (mimetype: string): boolean => {
  return Object.keys(ALLOWED_FILE_TYPES).includes(mimetype);
};

export const getFileExtension = (mimetype: string, originalname: string): string => {
  return ALLOWED_FILE_TYPES[mimetype] || path.extname(originalname).substring(1);
};

export const generateUniqueFilename = (fieldname: string, mimetype: string, originalname: string): string => {
  const ext = getFileExtension(mimetype, originalname);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${fieldname}-${uniqueSuffix}.${ext}`;
};

export const getUploadPath = (mimetype: string): string => {
  let uploadPath = 'uploads/';
  
  if (mimetype.startsWith('image/')) {
    uploadPath += 'images/';
  } else if (mimetype.startsWith('application/')) {
    uploadPath += 'documents/';
  } else {
    uploadPath += 'others/';
  }
  
  return uploadPath;
};

// Function to delete file
export const deleteFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
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
export const validateFileType = (file: UploadedFile, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

// Function to validate file size
export const validateFileSize = (file: UploadedFile, maxSizeInBytes: number): boolean => {
  return file.size <= maxSizeInBytes;
};

// Export constants
export { ALLOWED_FILE_TYPES, MAX_FILE_SIZE };
