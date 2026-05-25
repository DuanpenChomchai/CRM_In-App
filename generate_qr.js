const fs = require('fs');
const https = require('https');
const path = require('path');

const data = 'https://crminapp.online/login';
const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(data)}`;
const outputPath = path.join(__dirname, 'qr_code.png');

console.log('Downloading QR Code...');
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download QR Code. Status Code: ${response.statusCode}`);
    return;
  }

  const fileStream = fs.createWriteStream(outputPath);
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log(`Successfully generated and saved QR Code to: ${outputPath}`);
  });
}).on('error', (err) => {
  console.error('Error downloading QR Code:', err.message);
});
