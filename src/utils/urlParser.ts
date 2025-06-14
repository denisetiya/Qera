export function parseUrl(url: string, queryString: string): { 
  query: Record<string, string | string[]>,
  params: Record<string, string>
} {
  return {
    query: parseQuery(queryString),
    params: {}  // params are filled in by route matching logic
  };
}

export function parseQuery(queryString: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  
  if (!queryString) {
    return result;
  }
  
  const pairs = queryString.split('&');
  
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

// Simple route pattern matcher that extracts params
export function matchRoute(routePattern: string, path: string): { match: boolean, params: Record<string, string> } {
  const params: Record<string, string> = {};
  
  // Convert route pattern to regex pattern
  let regexPattern = '^' + routePattern
    .replace(/:[a-zA-Z0-9_]+/g, match => {
      const paramName = match.substring(1);
      return `(?<${paramName}>[^/]+)`;
    })
    .replace(/\*/g, '.*')
    + '$';
  
  // Create regex and try to match
  const regex = new RegExp(regexPattern);
  const match = regex.exec(path);
  
  if (!match) {
    return { match: false, params };
  }
  
  // Extract named params from groups
  if (match.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      params[key] = value;
    }
  }
  
  return { match: true, params };
}
