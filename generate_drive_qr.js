const fs = require('fs');
const https = require('https');
const path = require('path');

const data = 'https://drive.google.com/drive/folders/1fIXWigQ34HbIHLlf13FgvKgw9q9-CEWM?usp=drive_link';
const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(data)}`;
const outputPath = path.join(__dirname, 'drive_qr_code.png');

console.log('Downloading Google Drive QR Code...');
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download QR Code. Status Code: ${response.statusCode}`);
    return;
  }

  const fileStream = fs.createWriteStream(outputPath);
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log(`Successfully generated and saved Google Drive QR Code to: ${outputPath}`);
  });
}).on('error', (err) => {
  console.error('Error downloading QR Code:', err.message);
});
