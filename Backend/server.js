const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, FishCatch } = require('./database'); // Make sure this path is correct
// Create a new directory synchronously
const newFolderPath = path.join(__dirname, 'uploads');

try {
  fs.mkdirSync(newFolderPath, { recursive: true });
  console.log('Folder created successfully');
} catch (err) {
  console.error('Error creating folder:', err);
}

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully', username });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});




app.post('/identify-fish', upload.single('image'), async (req, res) => {
  console.log('Received request body:', req.body);

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const { username, latitude, longitude } = req.body;
  if (!username || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Username and location are required' });
  }

  // Validate latitude and longitude
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  console.log('Parsed latitude and longitude:', { lat, lon });

  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    return res.status(400).json({ error: 'Invalid latitude or longitude' });
  }

  const filePath = path.resolve(req.file.path);

  try {
    const imagePart = fileToGenerativePart(filePath, req.file.mimetype);

    const prompt = `
      Analyze this image of a fish and provide the following information:
      1. Fish Name: Identify the species of the fish.
      2. Rarity Score: Rate the rarity of the fish on a scale from 1 to 10 in terms of fish native to Canada, where 1 is very common and 10 is extremely rare.
      3. Description: Provide a brief description of the fish.
      4. Location: Suggest a typical location where this fish might be found.
      5. Fish Story: Create a short, interesting story about catching this fish.
      6. Weight: Estimate the weight of the fish in grams.
      7. Length: Estimate the length of the fish in centimeters.
    `;

    const jsonSchema = {
      type: "object",
      properties: {
        fishName: { type: "string" },
        rarityScore: { type: "number" },
        description: { type: "string" },
        location: { type: "string" },
        fishStory: { type: "string" },
        weight: { type: "number" },
        length: { type: "number" }
      },
      required: ["fishName", "rarityScore", "description", "location", "fishStory", "weight", "length"]
    };

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        { role: "user", parts: [imagePart] }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        topP: 1,
        topK: 32,
        responseMimeType: 'application/json',
        responseSchema: jsonSchema
      }
    });

    const response = await result.response;
    const fishInfo = JSON.parse(await response.text());

    console.log('AI generated fish info:', fishInfo);

    try {

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }



      // Create a new FishCatch document
      const newFishCatch = new FishCatch({
        ...fishInfo,
        caughtBy: user._id,
        dateCaught: new Date(),
        latitude: lat,
        longitude: lon
      });

      console.log('New fish catch object:', newFishCatch);

      // Save the new fish catch
      await newFishCatch.save();

      // Initialize fishCatches array if it doesn't exist
      if (!user.fishCatches) {
        user.fishCatches = [];
      }

      // Add the reference to the user's fishCatches array
      user.fishCatches.push(newFishCatch._id);
      await user.save();

      res.json({
        ...fishInfo,
        latitude: lat,
        longitude: lon
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'An error occurred while updating the database.', details: dbError.message });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'An error occurred while processing the image.' });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
  }
});


app.get('/get-all-fish-catches', async (req, res) => {
  const { query, username } = req.query;

  const filter = {};

  if (query) {
    const parsedRarity = parseFloat(query);

    if (!isNaN(parsedRarity)) {
      filter.rarityScore = parsedRarity;
    } else {
      filter.fishName = { $regex: query, $options: 'i' };
    }
  }

  try {
    let fishCatches;
    if (username) {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      filter.caughtBy = user._id;
    }

    fishCatches = await FishCatch.find(filter).populate('caughtBy', 'username');

    // Transform the data to include the username and format the location
    const formattedFishCatches = fishCatches.map(fishCatch => {
      const catchObject = fishCatch.toObject();
      return {
        ...catchObject,
        username: catchObject.caughtBy ? catchObject.caughtBy.username : 'Unknown User',
        location: `${catchObject.latitude},${catchObject.longitude}`,
        caughtBy: undefined // Remove the caughtBy field to avoid sending unnecessary data
      };
    });

    res.json(formattedFishCatches);
  } catch (error) {
    console.error('Error fetching fish catches:', error);
    res.status(500).json({ error: 'An error occurred while fetching fish catches' });
  }
});