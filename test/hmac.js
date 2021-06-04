'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Hmac = require('../lib/hmac');

const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;

describe('Hmac', () => {

    const mySecret = 'super secret!!! Do not share';
    const userId = 'myUserId';

    it('should export two methods', () => {

        expect(Hmac).to.include('encrypt')
            .and
            .to.include('validate');

        expect(Hmac.encrypt).to.be.a.function();
        expect(Hmac.validate).to.be.a.function();
    });

    describe('encrypt', () => {

        it('should return a digest and a timestamp concatenate with _', () => {

            const result = Hmac.encrypt(userId, mySecret);
            expect(result).to.be.a.string().and.to.include('_');
        });
    });

    describe('validate', () => {

        it('should return FALSE if the token is not in the right format', () => {

            let encryptedStr = 'thisIsNotaGoodformat';
            expect(Hmac.validate(encryptedStr, userId, mySecret)).to.be.a.false();

            encryptedStr = '_thisIsNotaGoodformat';
            expect(Hmac.validate(encryptedStr, userId, mySecret)).to.be.a.false();
        });

        it('should return FALSE if one of the parameters is null', () => {

            const encryptedStr = 'thisIsNotaGoodformat';

            expect(Hmac.validate(null, userId, mySecret)).to.be.a.false();
            expect(Hmac.validate(encryptedStr, null, mySecret)).to.be.a.false();
            expect(Hmac.validate(encryptedStr, userId, null)).to.be.a.false();
        });

        it('should return TRUE if the token is valid', () => {

            const encryptedStr = Hmac.encrypt(userId, mySecret);
            expect(Hmac.validate(encryptedStr, userId, mySecret)).to.be.a.true();
        });

        it('should return FALSE if digest do not match', () => {

            const encryptedStr = `123456ABCD_${Date.now().toString()}`;
            expect(Hmac.validate(encryptedStr, userId, mySecret)).to.be.a.false();
        });
    });
});
