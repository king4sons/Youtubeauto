import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export interface ExtendedSegment {
  id: number;
  title: string;
  body: string;
  durationInFrames: number;
}

export interface ExtendedProps {
  title: string;
  channelName: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  style: 'documentary' | 'educational' | 'vlog' | 'cinematic' | 'tutorial' | 'course';
  segments: ExtendedSegment[];
  totalDurationMinutes: number;
}

export const EXTENDED_PROPS: ExtendedProps = {
  title: 'Extended YouTube Video (10+ Minutes)',
  channelName: 'Your Channel',
  accentColor: '#FF0000',
  backgroundColor: '#0D0D0D',
  textColor: '#FFFFFF',
  style: 'documentary',
  totalDurationMinutes: 10,
  segments: [
    { id: 1, title: 'Introduction', body: 'Setting the stage for what viewers will learn today', durationInFrames: 1800 },
    { id: 2, title: 'Background', body: 'Key context and concepts you need to understand', durationInFrames: 3600 },
    { id: 3, title: 'Deep Dive', body: 'The main content - detailed explanation with examples', durationInFrames: 5400 },
    { id: 4, title: 'Case Studies', body: 'Real-world examples and practical applications', durationInFrames: 3600 },
    { id: 5, title: 'Conclusion', body: 'Key takeaways and next steps for viewers', durationInFrames: 1800 },
  ],
};

const STYLE_CONFIGS = {
  documentary: { primary: '#1a1a2e', accent: '#e94560', titleFont: 'Times New Roman' },
  educational: { primary: '#0f3460', accent: '#533483', titleFont: 'Arial' },
  vlog: { primary: '#16213e', accent: '#0f3460', titleFont: 'Impact' },
  cinematic: { primary: '#000000', accent: '#c9a96e', titleFont: 'Georgia' },
  tutorial: { primary: '#1a1a1a', accent: '#00b4d8', titleFont: 'Arial' },
  course: { primary: '#0a192f', accent: '#64ffda', titleFont: 'Arial' },
};

const ChapterCard: React.FC<{
  segment: ExtendedSegment;
  index: number;
  total: number;
  accentColor: string;
  textColor: string;
  titleFont: string;
  fps: number;
}> = ({ segment, index, total, accentColor, textColor, titleFont, fps }) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps, config: { stiffness: 100, damping: 22 } });
  const opacity = interpolate(frame, [0, 20, segment.durationInFrames - 30, segment.durationInFrames], [0, 1, 1, 0]);
  const slideX = interpolate(progress, [0, 1], [80, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', opacity }}>
      {/* Chapter indicator */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          transform: `translateX(${slideX}px)`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial',
            fontSize: 28,
            fontWeight: 'bold',
            color: textColor,
          }}
        >
          {index + 1}
        </div>
        <span
          style={{
            fontFamily: 'Arial',
            fontSize: 28,
            color: textColor,
            opacity: 0.6,
            textTransform: 'uppercase',
            letterSpacing: 4,
          }}
        >
          Chapter {index + 1} of {total}
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          padding: '0 120px',
          transform: `translateX(${slideX}px)`,
        }}
      >
        <div style={{ width: 100, height: 6, backgroundColor: accentColor, marginBottom: 40, borderRadius: 3 }} />
        <h2
          style={{
            fontFamily: titleFont,
            fontSize: 84,
            fontWeight: 900,
            color: textColor,
            margin: '0 0 32px',
            lineHeight: 1.1,
          }}
        >
          {segment.title}
        </h2>
        <p
          style={{
            fontFamily: 'Arial',
            fontSize: 44,
            color: textColor,
            opacity: 0.75,
            lineHeight: 1.6,
            margin: 0,
            maxWidth: '80%',
          }}
        >
          {segment.body}
        </p>
      </div>

      {/* Chapter progress dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? 40 : 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: i === index ? accentColor : `${textColor}40`,
              transition: 'width 0.3s',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const ExtendedVideo: React.FC<ExtendedProps> = ({
  title,
  channelName,
  accentColor,
  backgroundColor,
  textColor,
  style,
  segments,
  totalDurationMinutes,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const config = STYLE_CONFIGS[style];

  // Title card: first 5 seconds (150 frames)
  const titleOpacity = interpolate(frame, [0, 20, 130, 150], [0, 1, 1, 0]);
  const titleScale = spring({ frame, fps, config: { stiffness: 80, damping: 25 } });

  // Distribute remaining frames evenly if no explicit durations set
  const remainingFrames = durationInFrames - 150;
  const segmentFrames = segments.map((s) =>
    s.durationInFrames || Math.floor(remainingFrames / segments.length)
  );

  // Calculate cumulative start frames
  let cumulativeFrames = 150;
  const segmentStarts = segmentFrames.map((dur) => {
    const start = cumulativeFrames;
    cumulativeFrames += dur;
    return start;
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Background gradient overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${config.primary}88 0%, ${backgroundColor} 70%)`,
        }}
      />

      {/* Title sequence */}
      <Sequence from={0} durationInFrames={150}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: titleOpacity,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '0 160px',
              transform: `scale(${interpolate(titleScale, [0, 1], [0.9, 1])})`,
            }}
          >
            <p
              style={{
                fontFamily: 'Arial',
                fontSize: 32,
                color: accentColor,
                letterSpacing: 8,
                textTransform: 'uppercase',
                margin: '0 0 20px',
              }}
            >
              {channelName} • {totalDurationMinutes} Min Video
            </p>
            <h1
              style={{
                fontFamily: config.titleFont,
                fontSize: 108,
                fontWeight: 900,
                color: textColor,
                margin: '0 0 40px',
                lineHeight: 1.05,
                textShadow: '0 4px 60px rgba(0,0,0,0.9)',
              }}
            >
              {title}
            </h1>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 40,
                marginTop: 40,
              }}
            >
              {segments.map((seg, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'Arial',
                    fontSize: 28,
                    color: textColor,
                    opacity: 0.5,
                  }}
                >
                  {seg.title}
                </span>
              ))}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Chapter segments */}
      {segments.map((segment, i) => (
        <Sequence key={i} from={segmentStarts[i]} durationInFrames={segmentFrames[i]}>
          <ChapterCard
            segment={segment}
            index={i}
            total={segments.length}
            accentColor={accentColor}
            textColor={textColor}
            titleFont={config.titleFont}
            fps={fps}
          />
        </Sequence>
      ))}

      {/* Overall progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 4,
          backgroundColor: accentColor,
          width: `${(frame / durationInFrames) * 100}%`,
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  );
};
