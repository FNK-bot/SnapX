import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/weights';

export const loadModels = async () => {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('FaceAPI Models Loaded');
    } catch (err) {
        console.error("Failed to load models", err);
    }
};

export const getFaceDescriptor = async (img: HTMLImageElement): Promise<Float32Array | undefined> => {
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    return detection?.descriptor;
};

export const getAllFaceDescriptors = async (img: HTMLImageElement): Promise<Float32Array[]> => {
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    return detections.map(d => d.descriptor);
};

export const loadImageFromBlob = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};
