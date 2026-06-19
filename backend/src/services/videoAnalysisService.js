const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const WATCH_SCRIPT = path.resolve(__dirname, '../../../../scripts/watch.py');
const ANALYSIS_DIR = path.resolve(__dirname, '../../../../.analysis');

class VideoAnalysisService {
  constructor() {
    fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
  }

  /**
   * Start a video analysis job (download + frames + transcript).
   * Returns an analysisId; poll getStatus() to track progress.
   */
  async startAnalysis(url, options = {}) {
    const { maxFrames = 60, every = 0, noWhisper = false } = options;

    const analysisId = uuidv4();
    const outDir = path.join(ANALYSIS_DIR, analysisId);
    fs.mkdirSync(outDir, { recursive: true });

    const meta = {
      analysisId,
      url,
      status: 'processing',
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      frameCount: 0,
      wordCount: 0
    };
    this._writeMeta(outDir, meta);

    // Run watch.py in background, update meta on completion
    const args = [WATCH_SCRIPT, url, '--out', outDir, '--max-frames', String(maxFrames), '--every', String(every)];
    if (noWhisper) args.push('--no-whisper');

    const proc = spawn('python3', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      const updated = { ...meta, completedAt: new Date().toISOString() };
      if (code !== 0) {
        updated.status = 'failed';
        updated.error = stderr.trim() || `Process exited with code ${code}`;
        logger.error(`Video analysis failed [${analysisId}]: ${updated.error}`);
      } else {
        updated.status = 'completed';
        const indexPath = path.join(outDir, 'index.json');
        if (fs.existsSync(indexPath)) {
          updated.frameCount = JSON.parse(fs.readFileSync(indexPath, 'utf8')).length;
        }
        const transcriptPath = path.join(outDir, 'transcript.txt');
        if (fs.existsSync(transcriptPath)) {
          updated.wordCount = fs.readFileSync(transcriptPath, 'utf8').trim().split(/\s+/).filter(Boolean).length;
        }
        logger.info(`Video analysis completed [${analysisId}]: ${updated.frameCount} frames, ${updated.wordCount} words`);
      }
      this._writeMeta(outDir, updated);
    });

    return { analysisId, status: 'processing' };
  }

  /**
   * Return status + summary for an analysis job.
   */
  getStatus(analysisId) {
    const meta = this._readMeta(analysisId);
    if (!meta) throw new Error('Analysis not found');
    return meta;
  }

  /**
   * Return the timestamped frame index for an analysis job.
   */
  getIndex(analysisId) {
    this._assertCompleted(analysisId);
    const outDir = path.join(ANALYSIS_DIR, analysisId);
    const indexPath = path.join(outDir, 'index.json');
    if (!fs.existsSync(indexPath)) throw new Error('Index not found');
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }

  /**
   * Return the full transcript for an analysis job.
   */
  getTranscript(analysisId) {
    this._assertCompleted(analysisId);
    const outDir = path.join(ANALYSIS_DIR, analysisId);
    const p = path.join(outDir, 'transcript.txt');
    if (!fs.existsSync(p)) return '';
    return fs.readFileSync(p, 'utf8');
  }

  /**
   * Return the absolute filesystem path of a frame image (validated).
   */
  getFramePath(analysisId, frameName) {
    this._assertCompleted(analysisId);
    if (!/^f\d+\.jpg$/.test(frameName)) throw new Error('Invalid frame name');
    const p = path.join(ANALYSIS_DIR, analysisId, 'frames', frameName);
    if (!fs.existsSync(p)) throw new Error('Frame not found');
    return p;
  }

  // ── private helpers ──────────────────────────────────────────────────────

  _writeMeta(outDir, meta) {
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
  }

  _readMeta(analysisId) {
    const p = path.join(ANALYSIS_DIR, analysisId, 'meta.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  _assertCompleted(analysisId) {
    const meta = this._readMeta(analysisId);
    if (!meta) throw new Error('Analysis not found');
    if (meta.status !== 'completed') throw new Error(`Analysis is ${meta.status}`);
  }
}

module.exports = new VideoAnalysisService();
