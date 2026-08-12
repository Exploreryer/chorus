import rawPlatforms from './platforms.json';
import type { PlatformDefinition, Product, ProductId } from '../types';

export const platformDefinitions = rawPlatforms as PlatformDefinition[];

export const defaultProducts: Product[] = platformDefinitions.map(({ adapter: _adapter, ...product }) => product);

export const platformMatches = [...new Set(platformDefinitions.flatMap((platform) => platform.matches))];

export function getPlatform(id: ProductId): PlatformDefinition | undefined {
  return platformDefinitions.find((platform) => platform.id === id);
}

export function getProduct(id: ProductId): Product | undefined {
  return defaultProducts.find((product) => product.id === id);
}

export function isLoginUrl(url: string | undefined, product: Product): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return product.loginHints.some((hint) => lowerUrl.includes(hint.toLowerCase()));
}

export function isReusableProductUrl(url: string | undefined, product: Product): boolean {
  if (!url) return false;

  try {
    const candidate = new URL(url);
    const allowedOrigins = new Set(
      product.matches.map((match) => new URL(match.replace(/\*$/, '')).origin)
    );
    if (!allowedOrigins.has(candidate.origin)) return false;

    const path = candidate.pathname.replace(/\/$/, '') || '/';
    return product.reusablePaths.some((allowedPath) => {
      const normalized = allowedPath.replace(/\/$/, '') || '/';
      return path === normalized;
    });
  } catch {
    return false;
  }
}
