require('dotenv').config();
const fs = require('fs');
const colors = require('colors');
const moment = require('moment');
const { sendTelegramMessage } = require('./sendTelegramMessage');

const {
  sendSol,
  generateRandomAddresses,
  getKeypairFromPrivateKey,
  PublicKey,
  connection,
  LAMPORTS_PER_SOL,
  delay,
} = require('./src/solanaUtils');

const { displayHeader } = require('./src/displayUtils');

(async () => {
  displayHeader();

  const addressCount = 100;
  const amountToSend = 0.001;
  const delayBetweenTx = 1000;

  const seedPhrasesOrKeys = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
  
  if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
    throw new Error(colors.red('privateKeys.json tidak diatur dengan benar atau kosong'));
  }

  const randomAddresses = generateRandomAddresses(addressCount);
  let rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(0) / LAMPORTS_PER_SOL || 0.001;

  if (amountToSend < rentExemptionAmount) {
    console.log(colors.red(`Jumlah yang ditentukan tidak valid. Jumlah harus setidaknya ${rentExemptionAmount} SOL.`));
    return;
  }

  let totalSuccessful = 0;
  let totalFailed = 0;

  for (const [index, privateKey] of seedPhrasesOrKeys.entries()) {
    let fromKeypair;
    try {
      fromKeypair = getKeypairFromPrivateKey(privateKey);
      console.log(colors.yellow(`Mengirim SOL dari akun ${index + 1}: ${fromKeypair.publicKey}`));

      for (const address of randomAddresses) {
        try {
          await sendSol(fromKeypair, new PublicKey(address), amountToSend);
          totalSuccessful++;
          console.log(colors.green(`Berhasil mengirim ${amountToSend} SOL ke ${address}`));
        } catch (error) {
          totalFailed++;
          console.error(colors.red(`Gagal mengirim SOL ke ${address}:`), error);
        }
        await delay(delayBetweenTx);
      }
    } catch (error) {
      console.error(colors.red(`Gagal membuat keypair dari private key ke-${index + 1}:`), error);
    }
  }

  const now = moment();
  const formattedDate = now.format('Do MMMM YYYY');
  const summaryMessage = `*Sonic Testnet ${formattedDate}*\n\n*Send Sol 100x*\nSukses: ${totalSuccessful} Akun\nGagal: ${totalFailed} Akun\n`;
  fs.writeFileSync('summary_index.json', JSON.stringify({ summaryMessage }));
  console.log(summaryMessage.green);

})();
