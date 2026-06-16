type ClassValue = string | (() => string) | undefined | null | false;

export function mergeClass(...classes: ClassValue[]): () => string
{
    return () => classes
        .map(c => typeof c === 'function' ? c() : (c || ''))
        .filter(Boolean)
        .join(' ')
        .trim();
}