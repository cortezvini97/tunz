const speakeasy = require('speakeasy');

// Gerar token 2FA para teste
const secret = 'G5XF4I3MFZJE2JRPFE4HAKSNFFNFESR6FBFCUOTIHJEUI5T5IA7Q';

const token = speakeasy.totp({
    secret: secret,
    encoding: 'base32'
});

console.log('Token 2FA atual:', token);
console.log('Use este código no teste de login:');
console.log(`node src/index.js login -e teste2fa@teste.com -p teste123`);
console.log('Quando solicitar o código, digite:', token);
