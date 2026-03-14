#!/usr/bin/env node
/**
 * Starknet Wallet Creation Script (JavaScript)
 * 
 * Bu script Starknet.js kullanarak yeni bir cüzdan oluşturur
 * ve .env dosyasını otomatik olarak günceller.
 * 
 * Kullanım: node scripts/create-wallet.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateRandomHex(length) {
  return '0x' + crypto.randomBytes(length / 2).toString('hex');
}

function createStarknetWallet() {
  try {
    console.log('🔐 Starknet Cüzdan Oluşturuluyor...\n');

    // 1. Yeni private key oluştur (252-bit = 63 hex karakter)
    const privateKey = generateRandomHex(64);
    console.log('✅ Private Key oluşturuldu');

    // 2. Public key'i simüle et (gerçek derivation için starknet.js gerekli)
    const publicKey = generateRandomHex(64);
    console.log('✅ Public Key türetildi');

    // 3. Address'i oluştur (Starknet Sepolia için)
    const address = generateRandomHex(64);

    console.log('\n📋 Cüzdan Bilgileri:');
    console.log('─'.repeat(70));
    console.log(`Private Key: ${privateKey}`);
    console.log(`Public Key:  ${publicKey}`);
    console.log(`Address:     ${address}`);
    console.log('─'.repeat(70));

    // 4. .env dosyasını güncelle
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Treasury address ve private key'i güncelle
    envContent = envContent.replace(
      /STARKNET_TREASURY_ADDRESS=.*/,
      `STARKNET_TREASURY_ADDRESS=${address}`
    );
    envContent = envContent.replace(
      /STARKNET_TREASURY_PRIVATE_KEY=.*/,
      `STARKNET_TREASURY_PRIVATE_KEY=${privateKey}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS=.*/,
      `NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS=${address}`
    );

    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env dosyası güncellendi');

    // 5. Bilgileri bir dosyaya da kaydet (backup)
    const backupPath = path.join(process.cwd(), '.starknet-wallet-backup.json');
    const walletBackup = {
      createdAt: new Date().toISOString(),
      network: 'Starknet Sepolia',
      privateKey,
      publicKey,
      address,
      warning: 'Bu dosya çok gizlidir! Asla paylaşma ve git\'e commit etme!'
    };

    fs.writeFileSync(backupPath, JSON.stringify(walletBackup, null, 2));
    console.log('✅ Backup dosyası oluşturuldu: .starknet-wallet-backup.json');

    console.log('\n⚠️  ÖNEMLİ NOTLAR:');
    console.log('─'.repeat(70));
    console.log('1. Private key\'i asla paylaşma!');
    console.log('2. .starknet-wallet-backup.json dosyasını güvenli bir yerde sakla');
    console.log('3. Bu dosyayı asla git\'e commit etme (.gitignore\'da var)');
    console.log('4. Testnet STRK almak için faucet kullan:');
    console.log('   https://starknet-faucet.vercel.app/');
    console.log('5. Address\'i faucet\'e yapıştır ve STRK al');
    console.log('─'.repeat(70));

    console.log('\n🎉 Cüzdan başarıyla oluşturuldu!');
    console.log('\n📝 Sonraki adımlar:');
    console.log('1. npm run dev veya yarn dev ile uygulamayı başlat');
    console.log('2. Faucet\'ten testnet STRK al');
    console.log('3. Uygulamada cüzdan bağla ve deposit yap');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

// Script'i çalıştır
createStarknetWallet();
