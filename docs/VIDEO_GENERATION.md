# AI Video Generation Integration

## 🎬 Supported AI Providers

The YouTube Automation Tool now supports 8+ AI video generation providers:

### Long-Form Video Generation
- **Google Veo 3** - Advanced AI video generation
- **Runway ML** - Professional video AI
- **Synthesia** - Avatar-based video creation

### Short-Form Video Generation
- **Leonardo.ai** - Image and video generation
- **Pika 1.0** - Quick video generation
- **Kling AI** - Fast AI video creation

### Voice Generation
- **ElevenLabs** - Premium text-to-speech and voiceovers

### Video Editing
- **Descript** - AI-powered video editing

## 📋 Features

### 1. Video Generation
```bash
POST /api/video-generation/generate
```
Generate videos with custom parameters:
- Prompt (required)
- Provider selection
- Format (longform, shortform, portrait, landscape)
- Duration (10-120 seconds)
- Aspect ratio (16:9, 9:16, 1:1, 4:3)
- Style (cinematic, realistic, anime, 3D, documentary)

### 2. Short-Form Generation
```bash
POST /api/video-generation/generate-shortform
```
Automatically optimized for TikTok, Instagram Reels, YouTube Shorts:
- Aspect ratio: 9:16
- Duration: 30 seconds max
- Styles: trendy, tutorial, comedy, educational, aesthetic

### 3. Long-Form Generation
```bash
POST /api/video-generation/generate-longform
```
Optimized for YouTube and professional content:
- Aspect ratio: 16:9
- Duration: 60 seconds
- Styles: cinematic, documentary, educational, vlog, promotional

### 4. Voiceover Generation
```bash
POST /api/video-generation/voiceover
```
Generate professional voiceovers using ElevenLabs:
- Text input
- Multiple voice options
- Natural language processing

### 5. Status Monitoring
```bash
GET /api/video-generation/:generationId/status
```
Real-time tracking of generation jobs

### 6. Generation History
```bash
GET /api/video-generation/history?limit=20
```
View all past generations

### 7. Provider Information
```bash
GET /api/video-generation/providers
```
Get list of available providers and their capabilities

## 🔧 Setup Instructions

### Backend Configuration

1. **Install dependencies:**
```bash
cd backend
npm install axios dotenv
```

2. **Update `.env` file with API credentials:**
```env
# Veo 3 (Google)
VEO3_API_ENDPOINT=https://api.google.com/veo
VEO3_API_KEY=your_veo3_key

# Runway
RUNWAY_API_ENDPOINT=https://api.runway.com
RUNWAY_API_KEY=your_runway_key

# Leonardo.ai
LEONARDO_API_ENDPOINT=https://api.leonardo.ai
LEONARDO_API_KEY=your_leonardo_key

# Synthesia
SYNTHESIA_API_ENDPOINT=https://api.synthesia.io
SYNTHESIA_API_KEY=your_synthesia_key

# ElevenLabs
ELEVEN_API_ENDPOINT=https://api.elevenlabs.io
ELEVEN_API_KEY=your_eleven_key

# Pika
PIKA_API_ENDPOINT=https://api.pika.art
PIKA_API_KEY=your_pika_key

# Kling
KLING_API_ENDPOINT=https://api.kling.com
KLING_API_KEY=your_kling_key

# Descript
DESCRIPT_API_ENDPOINT=https://api.descript.com
DESCRIPT_API_KEY=your_descript_key
```

3. **Register routes in main app:**
```javascript
const videoGenerationRoutes = require('./routes/videoGenerationRoutes');
app.use('/api/video-generation', videoGenerationRoutes);
```

### Frontend Integration

1. **Import the VideoGeneration component:**
```javascript
import VideoGeneration from './components/VideoGeneration';
```

2. **Add to your router:**
```javascript
<Route path="/video-generation" element={<VideoGeneration />} />
```

3. **Redux store setup:**
```javascript
import videoGenerationReducer from './redux/videoGenerationReducer';

const store = configureStore({
  reducer: {
    videoGeneration: videoGenerationReducer,
    // ... other reducers
  }
});
```

## 📊 Example API Calls

### Generate a Cinematic Video
```bash
curl -X POST http://localhost:5000/api/video-generation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "A cinematic sunset over mountains with smooth camera movement",
    "provider": "veo3",
    "format": "longform",
    "duration": 60,
    "aspectRatio": "16:9",
    "style": "cinematic"
  }'
```

### Generate a TikTok Video
```bash
curl -X POST http://localhost:5000/api/video-generation/generate-shortform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Trending dance transition with effects",
    "style": "trendy"
  }'
```

### Generate a Voiceover
```bash
curl -X POST http://localhost:5000/api/video-generation/voiceover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Welcome to my channel! Today we are going to learn...",
    "voiceId": "default"
  }'
```

### Check Generation Status
```bash
curl -X GET http://localhost:5000/api/video-generation/GENERATION_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔐 API Keys

Get your API keys from:
- **Google Veo 3**: https://cloud.google.com
- **Runway ML**: https://runwayml.com/api
- **Leonardo.ai**: https://leonardo.ai/api
- **Synthesia**: https://synthesia.io/api
- **ElevenLabs**: https://elevenlabs.io/api
- **Pika**: https://pika.art/api
- **Kling**: https://kling.com/api
- **Descript**: https://descript.com/api

## 📈 Estimated Processing Times

| Provider | Type | Duration |
|----------|------|----------|
| Veo 3 | Long-form | 2 minutes |
| Runway | Long-form | 3 minutes |
| Leonardo | Images/Videos | 1 minute |
| Synthesia | Avatar Video | 2.5 minutes |
| Pika | Short-form | 1.5 minutes |
| Kling | Short-form | 2 minutes |
| ElevenLabs | Voiceover | 30 seconds |

## 🚀 Performance Tips

1. **Batch Processing**: Queue multiple generations for better throughput
2. **Caching**: Implement caching for frequently used styles
3. **Webhooks**: Use webhooks for real-time status updates instead of polling
4. **Quality Settings**: Lower quality for faster processing, higher for professional use
5. **Provider Selection**: Choose provider based on your speed/quality needs

## 🐛 Troubleshooting

### Generation Fails
- Check API keys are correct and active
- Verify prompt length and format
- Check rate limits for the provider

### Slow Processing
- Some providers are slower than others
- Peak hours may cause delays
- Reduce video duration for faster results

### Status Check Returns Error
- Verify the generation ID is correct
- Check if generation has expired
- Ensure proper authentication

## 📚 Documentation

For detailed provider documentation:
- [Google Veo Documentation](https://cloud.google.com/veo)
- [Runway ML Documentation](https://docs.runwayml.com)
- [Leonardo.ai Documentation](https://docs.leonardo.ai)
- [Synthesia Documentation](https://docs.synthesia.io)
- [ElevenLabs Documentation](https://docs.elevenlabs.io)

## 🎯 Future Enhancements

- [ ] Video editing timeline
- [ ] Multi-video stitching
- [ ] Automatic subtitle generation
- [ ] Background music integration
- [ ] Advanced effects library
- [ ] Batch processing dashboard
- [ ] Generation templates
- [ ] Collaboration features
