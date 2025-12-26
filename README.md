# SnapX - AI Face Recognition Photo Sharing

SnapX is a production-ready web application for event photo sharing. It allows organizers to upload event photos and attendees to find their specific photos simply by uploading a selfie. The system uses server-side face recognition to match faces with high accuracy.

## 🚀 How to Run

### 1. Prerequisites
*   **MongoDB**: Ensure MongoDB is installed and running locally on default port 27017.
*   **Cloudinary Account**: You need a free Cloudinary account for image storage.

### 2. Configuration
Open the `.env` file in the root directory and update it with your Cloudinary credentials:
```ini
MONGO_URI=mongodb://localhost:27017/snapx
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Installation
The project is divided into `server` and `client`.

**Install Server Dependencies:**
```bash
cd server
npm install
```

**Install Client Dependencies:**
```bash
cd client
npm install
```

### 4. Running the Application
You need to run both the backend and frontend terminals.

**Terminal 1: Start Backend**
```bash
cd server
npm run dev
```
*   Starts the Express server on port 5000.
*   Loads AI models into memory (takes a few seconds).
*   Connects to MongoDB.

**Terminal 2: Start Frontend**
```bash
cd client
npm run dev
```
*   Starts the React app (usually on http://localhost:5173).

---

## 🧠 How It Works

### Core Concept: Face Embeddings
Instead of comparing images pixel-by-pixel, SnapX uses **Face Embeddings**. 
1.  **Detection**: The AI (`Inception ResNet` via `face-api.js`) scans an image and finds faces.
2.  **Vectorization**: For each face, it calculates a unique set of 128 numbers (a vector). This vector represents the facial features (distance between eyes, nose shape, etc.).
3.  **Storage**: When an organizer uploads photos, we calculate and store these vectors in MongoDB alongside the image URL.

### The Workflow

#### 1. Creating a Collection
*   **User Action**: You create an event (e.g., "Wedding").
*   **System**: Generates a unique `collectionId` and a QR code pointing to `yoursite/collections/:id`.

#### 2. Organizer Upload (The Heavy Lifting)
*   **User Action**: Organizer uploads 50 raw images.
*   **Server Process**:
    *   Receives images in memory.
    *   **AI Processing**: Runs `faceapi.detectAllFaces`.
    *   Extracts face descriptors (embeddings) for *every* face found in *every* photo.
    *   Uploads the image to **Cloudinary** to get a public URL.
    *   Saves the `CloudinaryURL` + `Array of Face Embeddings` to MongoDB.

#### 3. Finding Photos (The Magic)
*   **User Action**: Guest scans QR code and uploads a selfie.
*   **Server Process**:
    *   Detects the single face in the selfie.
    *   Generates the 128-number vector for the selfie.
    *   **Matching Algorithm**: It fetches all image vectors for that collection from DB.
    *   It calculates the **Euclidean Distance** between the selfie vector and every stored face vector.
    *   If the difference is less than `0.6` (a strict similarity threshold), it's a match.
    *   Returns only the matching photos to the user.

### 🔧 Tech Stack
*   **Frontend**: React, TypeScript, Tailwind CSS.
*   **Backend**: Node.js, Express, `canvas` (for server-side image manipulation).
*   **AI**: `face-api.js` running on `tensorflow.js` for Node.
*   **Database**: MongoDB (Stores metadata & vectors).
*   **Storage**: Cloudinary (Stores actual image files).
