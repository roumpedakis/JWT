const Dictionary = require('../../src/utils/Dictionary');

describe('Dictionary', () => {
    test('defaults to greek language', () => {
        const v = Dictionary.get('missing_hash');
        expect(v.code).toBe('E400003');
        expect(v.message).toBe('Λείπει το hash');
    });

    test('returns english message when EN requested', () => {
        const v = Dictionary.get('missing_hash', 'EN');
        expect(v.code).toBe('E400003');
        expect(v.message).toBe('Missing hash');
    });

    test('fromRequest resolves language from query/header/body', () => {
        expect(Dictionary.fromRequest({ query: { lang: 'EN' }, body: {}, headers: {} })).toBe('en');
        expect(Dictionary.fromRequest({ query: {}, body: { lang: 'el' }, headers: {} })).toBe('el');
        expect(Dictionary.fromRequest({ query: {}, body: {}, headers: { 'accept-language': 'en-US,en;q=0.9' } })).toBe('en');
    });
});
