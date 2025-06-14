export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) {
    return cookies;
  }
  
  // Split cookie string by semicolons and parse each cookie
  const cookieParts = cookieHeader.split(';');
  
  for (const part of cookieParts) {
    const [key, value] = part.trim().split('=', 2);
    
    if (key && value !== undefined) {
      cookies[key] = decodeURIComponent(value);
    }
  }
  
  return cookies;
}
