import fs from 'fs';
import path from 'path';
import https from 'https';

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const weightsDir = path.resolve(__dirname, '../weights');

const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

if (!fs.existsSync(weightsDir)) {
    fs.mkdirSync(weightsDir, { recursive: true });
}

const downloadFile = (file: string) => {
    const filePath = path.join(weightsDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`${file} already exists.`);
        return;
    }

    const fileUrl = `${baseUrl}/${file}`;
    const fileStream = fs.createWriteStream(filePath);

    console.log(`Downloading ${file}...`);
    https.get(fileUrl, (response) => {
        if (response.statusCode === 200) {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${file}`);
            });
        } else {
            console.error(`Failed to download ${file}: Status ${response.statusCode}`);
        }
    }).on('error', (err) => {
        fs.unlink(filePath, () => { });
        console.error(`Error downloading ${file}: ${err.message}`);
    });
};

console.log(`Downloading models to ${weightsDir}...`);
files.forEach(file => downloadFile(file));
