const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const REMOTION_DIR = path.resolve(__dirname, '../../../remotion');
const OUTPUT_DIR = path.resolve(__dirname, '../../../remotion/out');

const COMPOSITION_MAP = {
  shortform: 'ShortFormVideo',
  longform: 'LongFormVideo',
  extended: 'ExtendedVideo',
};

class RemotionRenderingService {
  constructor() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Render a video locally using the Remotion CLI.
   * Requires `npm install` to have been run inside /remotion first.
   *
   * @param {Object} params
   * @param {string} params.format - 'shortform' | 'longform' | 'extended'
   * @param {Object} params.props  - Composition props (merged with defaults)
   * @param {string} [params.outputFileName] - Output filename (without extension)
   * @returns {Promise<{outputPath: string, renderPath: 'local'}>}
   */
  async renderLocally({ format, props = {}, outputFileName }) {
    const compositionId = COMPOSITION_MAP[format];
    if (!compositionId) {
      throw new Error(`Unknown format "${format}". Valid: ${Object.keys(COMPOSITION_MAP).join(', ')}`);
    }

    const fileName = outputFileName || `${format}-${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    const propsJson = JSON.stringify(props);
    const entryPoint = path.join(REMOTION_DIR, 'src/index.ts');

    logger.info(`Starting local Remotion render: ${compositionId} -> ${outputPath}`);

    return new Promise((resolve, reject) => {
      execFile(
        'npx',
        [
          'remotion', 'render',
          entryPoint,
          compositionId,
          outputPath,
          '--props', propsJson,
        ],
        {
          cwd: REMOTION_DIR,
          timeout: 30 * 60 * 1000, // 30 minute timeout for extended videos
          maxBuffer: 50 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error) {
            logger.error(`Remotion render failed: ${error.message}`);
            logger.error(`stderr: ${stderr}`);
            return reject(new Error(`Render failed: ${error.message}`));
          }
          logger.info(`Remotion render complete: ${outputPath}`);
          resolve({ outputPath, renderPath: 'local' });
        }
      );
    });
  }

  /**
   * Render using Remotion Lambda (cloud rendering — no headless Chrome needed locally).
   * Requires REMOTION_APP_REGION, REMOTION_APP_FUNCTION_NAME, and REMOTION_APP_BUCKET
   * environment variables set up via `npx remotion lambda` CLI.
   *
   * @param {Object} params
   * @param {string} params.format
   * @param {Object} params.props
   * @returns {Promise<{renderId: string, bucketName: string, renderPath: 'lambda'}>}
   */
  async renderWithLambda({ format, props = {} }) {
    const compositionId = COMPOSITION_MAP[format];
    if (!compositionId) {
      throw new Error(`Unknown format "${format}". Valid: ${Object.keys(COMPOSITION_MAP).join(', ')}`);
    }

    const region = process.env.REMOTION_APP_REGION;
    const functionName = process.env.REMOTION_APP_FUNCTION_NAME;
    const bucketName = process.env.REMOTION_APP_BUCKET;
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!region || !functionName || !bucketName || !serveUrl) {
      throw new Error(
        'Lambda rendering requires REMOTION_APP_REGION, REMOTION_APP_FUNCTION_NAME, ' +
        'REMOTION_APP_BUCKET, and REMOTION_SERVE_URL environment variables.'
      );
    }

    // Dynamically require @remotion/lambda only when actually used,
    // so the service doesn't crash when the package isn't installed.
    let renderMediaOnLambda, getRenderProgress;
    try {
      ({ renderMediaOnLambda, getRenderProgress } = require('@remotion/lambda'));
    } catch {
      throw new Error(
        '@remotion/lambda is not installed. Run `npm install @remotion/lambda` inside /remotion.'
      );
    }

    logger.info(`Starting Lambda render: ${compositionId} in ${region}`);

    const { renderId } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: compositionId,
      inputProps: props,
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 3,
      framesPerLambda: 40,
      privacy: 'private',
    });

    logger.info(`Lambda render started: renderId=${renderId}`);
    return { renderId, bucketName, renderPath: 'lambda' };
  }

  /**
   * Poll a Lambda render for completion.
   *
   * @param {Object} params
   * @param {string} params.renderId
   * @param {string} params.bucketName
   * @returns {Promise<{done: boolean, progress: number, outputFile?: string, errors?: string[]}>}
   */
  async getLambdaRenderProgress({ renderId, bucketName }) {
    const region = process.env.REMOTION_APP_REGION;
    const functionName = process.env.REMOTION_APP_FUNCTION_NAME;

    let getRenderProgress;
    try {
      ({ getRenderProgress } = require('@remotion/lambda'));
    } catch {
      throw new Error('@remotion/lambda is not installed.');
    }

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
    });

    return {
      done: progress.done,
      progress: Math.round((progress.overallProgress || 0) * 100),
      outputFile: progress.outputFile,
      errors: progress.errors,
    };
  }

  /**
   * Build Remotion input props from a video generation request.
   * Maps the API's format/style/prompt fields to typed composition props.
   *
   * @param {Object} params
   * @param {string} params.format
   * @param {string} params.prompt
   * @param {string} params.style
   * @param {string} [params.title]
   * @param {string} [params.channelName]
   * @param {string} [params.accentColor]
   * @param {number} [params.duration]     - seconds (for extended)
   * @param {Array}  [params.segments]     - pre-built segment objects
   * @returns {Object} props ready to pass to a Remotion composition
   */
  buildProps({ format, prompt, style, title, channelName, accentColor, duration, segments }) {
    const base = {
      accentColor: accentColor || '#FF0000',
      backgroundColor: '#0D0D0D',
      textColor: '#FFFFFF',
      channelName: channelName || 'YouTubeAuto',
    };

    if (format === 'shortform') {
      return {
        ...base,
        title: title || prompt.slice(0, 60),
        subtitle: prompt.slice(0, 120),
        style: style || 'trendy',
        hookText: 'Watch this!',
        callToAction: 'Subscribe for more!',
      };
    }

    if (format === 'extended') {
      const durationMinutes = Math.round((duration || 600) / 60);
      const builtSegments = segments && segments.length
        ? segments.map((s, i) => ({
            id: i + 1,
            title: s.title || `Part ${i + 1}`,
            body: s.prompt || s.body || '',
            durationInFrames: Math.floor(((s.duration || (duration / segments.length)) * 30)),
          }))
        : this._defaultSegments(durationMinutes);

      return {
        ...base,
        title: title || prompt.slice(0, 80),
        style: style || 'documentary',
        totalDurationMinutes: durationMinutes,
        segments: builtSegments,
      };
    }

    // longform default
    return {
      ...base,
      title: title || prompt.slice(0, 80),
      description: prompt.slice(0, 200),
      style: style || 'cinematic',
      sections: [
        { heading: 'Introduction', body: prompt.slice(0, 120) },
        { heading: 'Deep Dive', body: 'Detailed content goes here' },
        { heading: 'Conclusion', body: 'Key takeaways and call-to-action' },
      ],
    };
  }

  _defaultSegments(durationMinutes) {
    const framesPerMinute = 60 * 30;
    const introFrames = Math.floor(framesPerMinute * 0.5);
    const outroFrames = Math.floor(framesPerMinute * 0.5);
    const mainFrames = (durationMinutes * framesPerMinute) - introFrames - outroFrames;

    return [
      { id: 1, title: 'Introduction', body: 'Setting the stage', durationInFrames: introFrames },
      { id: 2, title: 'Main Content', body: 'Core value and insights', durationInFrames: mainFrames },
      { id: 3, title: 'Conclusion', body: 'Key takeaways', durationInFrames: outroFrames },
    ];
  }
}

module.exports = new RemotionRenderingService();
