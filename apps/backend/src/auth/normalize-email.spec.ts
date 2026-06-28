import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('lowercases the address', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('trims and lowercases together', () => {
    expect(normalizeEmail('  USER@Example.com\n')).toBe('user@example.com');
  });

  it('leaves an already normalized address unchanged', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});
