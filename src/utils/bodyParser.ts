import { HttpRequest, HttpResponse } from 'uWebSockets.js';

export async function parseBody(req: HttpRequest, res: HttpResponse, limit?: string | number): Promise<any> {
  const contentType = req.getHeader('content-type');
  const bufferLimit = parseLimit(limit || '1mb');

  return new Promise((resolve, reject) => {
    let buffer: Buffer;
    let offset = 0;
    let aborted = false;

    res.onAborted(() => {
      aborted = true;
      reject(new Error('Request aborted'));
    });

    res.onData((chunk, isLast) => {
      if (aborted) return;
      const chunkBuffer = Buffer.from(chunk);

      // Initialize or expand the buffer
      if (!buffer) {
        buffer = Buffer.allocUnsafe(chunkBuffer.length);
        chunkBuffer.copy(buffer);
        offset = chunkBuffer.length;
      } else {
        // Check size limit
        if (offset + chunkBuffer.length > bufferLimit) {
          aborted = true;
          reject(new Error('Request body too large'));
          return;
        }

        // Expand buffer to fit new chunk
        const newBuffer = Buffer.allocUnsafe(offset + chunkBuffer.length);
        buffer.copy(newBuffer, 0, 0, offset);
        chunkBuffer.copy(newBuffer, offset);
        buffer = newBuffer;
        offset += chunkBuffer.length;
      }

      // If this is the last chunk, parse and resolve
      if (isLast) {
        try {
          const body = parseBufferByContentType(buffer.slice(0, offset), contentType);
          resolve(body);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

function parseBufferByContentType(buffer: Buffer, contentType: string): any {
  if (buffer.length === 0) {
    return {};
  }
  
  const type = contentType.split(';')[0].toLowerCase();
  
  if (type === 'application/json') {
    return JSON.parse(buffer.toString());
  } else if (type === 'application/x-www-form-urlencoded') {
    return parseUrlEncoded(buffer.toString());
  } else if (type.startsWith('multipart/form-data')) {
    // Basic multipart form handling - in a real implementation this would be more robust
    const boundary = contentType.split('boundary=')[1];
    return parseMultipart(buffer, boundary);
  } else {
    // For plain text and other formats, just return the string
    return buffer.toString();
  }
}

function parseUrlEncoded(str: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  
  if (!str || str.length === 0) {
    return result;
  }
  
  const pairs = str.split('&');
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    
    if (result[key] === undefined) {
      result[key] = value || '';
    } else if (Array.isArray(result[key])) {
      (result[key] as string[]).push(value || '');
    } else {
      result[key] = [result[key] as string, value || ''];
    }
  }
  
  return result;
}

function parseMultipart(buffer: Buffer, boundary: string): Record<string, any> {
  // This is a simplified implementation
  // A real implementation would need to handle file uploads properly
  const result: Record<string, any> = {};
  
  // Convert buffer to string and split by boundary
  const content = buffer.toString();
  const parts = content.split(`--${boundary}`);
  
  // Process each part
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    const headerBodySplit = part.indexOf('\r\n\r\n');
    
    if (headerBodySplit !== -1) {
      const header = part.substring(0, headerBodySplit);
      const body = part.substring(headerBodySplit + 4);
      
      // Extract field name from Content-Disposition header
      const nameMatch = header.match(/name="([^"]+)"/);
      if (nameMatch) {
        const name = nameMatch[1];
        result[name] = body.replace(/\r\n$/, '');
      }
    }
  }
  
  return result;
}

function parseLimit(limit: string | number): number {
  if (typeof limit === 'number') {
    return limit;
  }
  
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = limit.toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z]{1,2})$/);
  if (!match) {
    return 1048576; // Default to 1MB
  }
  
  const size = parseFloat(match[1]);
  const unit = match[2];
  
  return size * (units[unit] || units.b);
}
