
const fs = require('fs');
const path = require('path');
const firebase = require('firebase-admin');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'Erro: Arquivo serviceAccountKey.json não encontrado na pasta scratch!');
  console.log('\nPara rodar este script utilitário, você precisa da chave privada do Firebase Admin SDK:');
  console.log('1. Acesse o Console do Firebase (https://console.firebase.google.com/)');
  console.log('2. Vá em Configurações do Projeto > Contas de Serviço');
  console.log('3. Clique em "Gerar nova chave privada"');
  console.log(`4. Salve o arquivo JSON gerado como "serviceAccountKey.json" dentro de: ${__dirname}\n`);
  process.exit(1);
}

const serviceAccount = require(keyPath);

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://karaoke-party-online-default-rtdb.firebaseio.com"
});

const db = firebase.database();

async function checkConfig() {
  try {
    const snap = await db.ref('config/catalog').once('value');
    console.log('CONFIG:', JSON.stringify(snap.val(), null, 2));
  } catch (err) {
    console.error('Erro ao buscar configurações no Firebase:', err.message);
  } finally {
    process.exit();
  }
}

checkConfig();
