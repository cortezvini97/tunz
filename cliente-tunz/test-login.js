const { spawn } = require('child_process');
const speakeasy = require('speakeasy');

async function testLogin() {
    const secret = 'G5XF4I3MFZJE2JRPFE4HAKSNFFNFESR6FBFCUOTIHJEUI5T5IA7Q';
    
    // Gerar token atual
    const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
    });
    
    console.log('🔑 Token 2FA gerado:', token);
    console.log('');
    
    // Executar o processo de login
    const child = spawn('node', ['src/index.js', 'login', '-e', 'teste2fa@teste.com', '-p', 'teste123'], {
        stdio: ['pipe', 'inherit', 'inherit']
    });
    
    // Aguardar um pouco e enviar as respostas
    setTimeout(() => {
        child.stdin.write('1\n'); // Escolher app de autenticação
    }, 2000);
    
    setTimeout(() => {
        child.stdin.write(token + '\n'); // Enviar o token
        child.stdin.end();
    }, 3000);
    
    child.on('close', (code) => {
        console.log('\n🏁 Processo finalizado com código:', code);
    });
}

testLogin().catch(console.error);
