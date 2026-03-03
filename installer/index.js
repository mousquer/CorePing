const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

// Templates
const tplConfig = require('./config');
const tplBackend = require('./backend');
const tplFrontend = require('./frontend');
const tplPrisma = require('./prisma');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

// Colors ANSI
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function runSetup() {
    console.clear();
    console.log("-----------------------------------------");
    console.log(`   CorePing v1.0.4 - INSTALLER`);
    console.log("-----------------------------------------");
    
    const osType = process.platform === 'win32' ? 'windows' : 'linux';
    console.log(`[INFO] Sistema: ${osType.toUpperCase()}`);

    let mode = 'fresh';
    if (fs.existsSync('package.json') && fs.existsSync('src/app.js')) {
        console.log(`\n${YELLOW}[!] Instalação detectada.${RESET}`);
        console.log("[1] Atualizar (Mantém dados)");
        console.log("[2] Reinstalar (Limpa dados/Config)");
        console.log("[3] DELETAR TUDO (Remove o sistema)");
        
        let choice = '';
        while (!['1', '2', '3'].includes(choice)) {
            choice = await ask("Opção [1/2/3]: ");
            if (!['1', '2', '3'].includes(choice)) {
                console.log(`${RED}[ERRO] Opção inválida! Digite apenas 1, 2 ou 3.${RESET}`);
            }
        }
        
        if (choice === '3') {
            const confirm = await ask(`${RED}Tem certeza? Digite 'DELETAR' para confirmar: ${RESET}`);
            if (confirm === 'DELETAR') {
                console.log(`${YELLOW}Apagando sistema...${RESET}`);
                try {
                    ['node_modules', 'src', 'public', 'prisma', '.wwebjs_auth', '.wwebjs_cache'].forEach(d => fs.rmSync(d, { recursive: true, force: true }));
                    ['.env', 'package.json', 'package-lock.json', 'ecosystem.config.js', 'README.md', 'reset-password.js', 'security-audit.log', '.gitattributes', '.gitignore'].forEach(f => { if(fs.existsSync(f)) fs.unlinkSync(f) });
                    console.log(`${GREEN}Sistema removido com sucesso.${RESET}`);
                } catch(e) { console.error(`${RED}Erro ao apagar: ${e.message}${RESET}`); }
                process.exit(0);
            } else {
                console.log("Cancelado.");
                process.exit(0);
            }
        }

        if (choice === '2') {
            mode = 'wipe';
            try {
                if (fs.existsSync('prisma/dev.db')) fs.unlinkSync('prisma/dev.db');
                if (fs.existsSync('.env')) fs.unlinkSync('.env');
                if (fs.existsSync('node_modules')) fs.rmSync('node_modules', { recursive: true, force: true });
                if (fs.existsSync('.wwebjs_auth')) fs.rmSync('.wwebjs_auth', { recursive: true, force: true });
            } catch(e) {}
        } else mode = 'update';
    }

    ['src', 'src/views', 'public', 'public/uploads', 'prisma'].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

    console.log(`[INFO] Escrevendo arquivos...`);
    try {
        const files = [
            { path: 'package.json', content: JSON.stringify(tplConfig.getPackageJson(), null, 2) },
            { path: 'ecosystem.config.js', content: tplConfig.getEcosystem() },
            { path: 'README.md', content: tplConfig.getReadme(osType) },
            { path: 'reset-password.js', content: tplBackend.getResetScript() },
            { path: 'src/app.js', content: tplBackend.getAppJs(osType).trim() },
            { path: 'src/views/dashboard.ejs', content: tplFrontend.getDashboardEjs().trim() },
            { path: 'src/views/login.ejs', content: tplFrontend.getLoginEjs().trim() },
            { path: 'src/views/setup.ejs', content: tplFrontend.getSetupEjs().trim() },
            { path: 'src/views/setupSmtp.ejs', content: tplFrontend.getSetupSmtpEjs().trim() },
            { path: 'prisma/schema.prisma', content: tplPrisma.getSchema().trim() }
        ];

        if (mode !== 'update' || !fs.existsSync('.env')) files.push({ path: '.env', content: tplConfig.getEnv() });

        files.forEach(f => fs.writeFileSync(f.path, f.content));
    } catch (err) { console.error(`${RED}[ERR] ${err.message}${RESET}`); process.exit(1); }

    try {
        console.log(`\n${YELLOW}[INFO] Instalando dependências (Isso pode demorar)...${RESET}`);
        execSync('npm install', { stdio: 'inherit' });
        
        console.log(`${YELLOW}[INFO] Configurando Banco de Dados...${RESET}`);
        execSync('npx prisma generate', { stdio: 'inherit' });
        
        if (mode !== 'update' || !fs.existsSync('prisma/dev.db')) {
            execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
        } else {
            execSync('npx prisma db push', { stdio: 'inherit' });
        }
        
        console.log(`\n${GREEN}✅ SUCESSO! Instalação Concluída.${RESET}`);
        console.log("-----------------------------------------");
        console.log(`${YELLOW}Iniciando a aplicação automaticamente...${RESET}`);
        
        execSync('npm run dev', { stdio: 'inherit' });

    } catch (e) { console.error(`${RED}[ERR] ${e.message}${RESET}`); }
    
    process.exit(0);
}


module.exports = { runSetup };
