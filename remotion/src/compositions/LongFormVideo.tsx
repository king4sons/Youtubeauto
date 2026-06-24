import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
  staticFile,
} from 'remotion';

export interface LongFormProps {
  title: string;
  description: string;
  channelName: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  style: 'cinematic' | 'documentary' | 'educational' | 'vlog' | 'promotional';
  sections: Array<{ heading: string; body: string }>;
}

export const LONG_FORM_PROPS: LongFormProps = {
  title: 'Your YouTube Video Title',
  description: 'A compelling description of what viewers will learn',
  channelName: 'Your Channel',
  accentColor: '#FF0000',
  backgroundColor: '#111111',
  textColor: '#FFFFFF',
  style: 'cinematic',
  sections: [
    { heading: 'Introduction', body: 'Hook viewers in the first few seconds' },
    { heading: 'Main Content', body: 'Deliver value with clear explanations' },
    { heading: 'Conclusion', body: "Summarize and include a call-to-action" },
  ],
};

const STYLE_CONFIGS = {
  cinematic: { overlay: 'rgba(0,0,0,0.55)', titleFont: 'Georgia', bodyFont: 'Arial' },
  documentary: { overlay: 'rgba(10,25,47,0.6)', titleFont: 'Times New Roman', bodyFont: 'Arial' },
  educational: { overlay: 'rgba(0,50,100,0.5)', titleFont: 'Arial', bodyFont: 'Arial' },
  vlog: { overlay: 'rgba(0,0,0,0.35)', titleFont: 'Impact', bodyFont: 'Arial' },
  promotional: { overlay: 'rgba(20,0,40,0.6)', titleFont: 'Impact', bodyFont: 'Arial' },
};

const Slide: React.FC<{
  heading: string;
  body: string;
  accentColor: string;
  textColor: string;
  titleFont: string;
  startFrame: number;
  fps: number;
}> = ({ heading, body, accentColor, textColor, titleFont, startFrame, fps }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const progress = spring({ frame: localFrame, fps, config: { stiffness: 120, damping: 20 } });
  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${interpolate(progress, [0, 1], [-40, 0])}px)`,
        padding: '0 120px',
      }}
    >
      <div
        style={{
          width: 80,
          height: 6,
          backgroundColor: accentColor,
          marginBottom: 32,
          borderRadius: 3,
        }}
      />
      <h2
        style={{
          fontFamily: titleFont,
          fontSize: 72,
          fontWeight: 'bold',
          color: textColor,
          margin: '0 0 24px',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          fontFamily: 'Arial',
          fontSize: 40,
          color: textColor,
          opacity: 0.8,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
};

export const LongFormVideo: React.FC<LongFormProps> = ({
  title,
  description,
  channelName,
  accentColor,
  backgroundColor,
  textColor,
  style,
  sections,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const config = STYLE_CONFIGS[style];

  // Title card: first 3 seconds
  const titleScale = spring({ frame, fps, config: { stiffness: 100, damping: 20 } });
  const titleOpacity = interpolate(frame, [0, 15, durationInFrames - 30, durationInFrames], [0, 1, 1, 0]);

  // Each section gets equal time after the title card (90 frames)
  const sectionDuration = Math.floor((durationInFrames - 90) / Math.max(sections.length, 1));

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Dark overlay */}
      <AbsoluteFill style={{ backgroundColor: config.overlay }} />

      {/* Cinematic letterbox bars */}
      {(style === 'cinematic' || style === 'documentary') && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, backgroundColor: '#000' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#000' }} />
        </>
      )}

      {/* Title sequence */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0]),
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '0 160px',
              transform: `scale(${interpolate(titleScale, [0, 1], [0.85, 1])})`,
            }}
          >
            <p
              style={{
                fontFamily: 'Arial',
                fontSize: 36,
                color: accentColor,
                letterSpacing: 6,
                textTransform: 'uppercase',
                margin: '0 0 24px',
              }}
            >
              {channelName}
            </p>
            <h1
              style={{
                fontFamily: config.titleFont,
                fontSize: 100,
                fontWeight: 900,
                color: textColor,
                margin: '0 0 40px',
                lineHeight: 1.1,
                textShadow: '0 4px 40px rgba(0,0,0,0.8)',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontFamily: 'Arial',
                fontSize: 44,
                color: textColor,
                opacity: 0.75,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Content sections */}
      {sections.map((section, i) => {
        const sectionStart = 90 + i * sectionDuration;
        return (
          <Sequence key={i} from={sectionStart} durationInFrames={sectionDuration}>
            <AbsoluteFill style={{ justifyContent: 'center' }}>
              <Slide
                heading={section.heading}
                body={section.body}
                accentColor={accentColor}
                textColor={textColor}
                titleFont={config.titleFont}
                startFrame={sectionStart}
                fps={fps}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: style === 'cinematic' || style === 'documentary' ? 80 : 0,
          left: 0,
          height: 6,
          backgroundColor: accentColor,
          width: `${(frame / durationInFrames) * 100}%`,
          transition: 'width 0.1s',
        }}
      />

      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          top: style === 'cinematic' || style === 'documentary' ? 100 : 20,
          right: 40,
          fontFamily: 'Arial',
          fontSize: 28,
          color: textColor,
          opacity: 0.4,
          fontWeight: 'bold',
        }}
      >
        {channelName}
      </div>
    </AbsoluteFill>
  );
};
