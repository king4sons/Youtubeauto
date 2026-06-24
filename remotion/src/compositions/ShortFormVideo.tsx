import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export interface ShortFormProps {
  title: string;
  subtitle: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  style: 'trendy' | 'tutorial' | 'comedy' | 'educational' | 'aesthetic';
  hookText: string;
  callToAction: string;
}

export const SHORT_FORM_PROPS: ShortFormProps = {
  title: 'Your Short-Form Video Title',
  subtitle: 'Engaging subtitle that hooks viewers',
  accentColor: '#FF0050',
  backgroundColor: '#0A0A0A',
  textColor: '#FFFFFF',
  style: 'trendy',
  hookText: 'Did you know...?',
  callToAction: 'Follow for more!',
};

const STYLE_CONFIGS = {
  trendy: { gradient: 'linear-gradient(135deg, #FF0050, #7928CA)', font: 'Impact' },
  tutorial: { gradient: 'linear-gradient(135deg, #0070F3, #00DFD8)', font: 'Arial' },
  comedy: { gradient: 'linear-gradient(135deg, #FF6B35, #FFE66D)', font: 'Comic Sans MS' },
  educational: { gradient: 'linear-gradient(135deg, #2D6A4F, #40916C)', font: 'Georgia' },
  aesthetic: { gradient: 'linear-gradient(135deg, #E8C4B8, #C9A96E)', font: 'Georgia' },
};

export const ShortFormVideo: React.FC<ShortFormProps> = ({
  title,
  subtitle,
  accentColor,
  backgroundColor,
  textColor,
  style,
  hookText,
  callToAction,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const config = STYLE_CONFIGS[style];

  // Hook card: frames 0-90 (3 seconds)
  const hookOpacity = interpolate(frame, [0, 10, 80, 90], [0, 1, 1, 0]);
  const hookScale = spring({ frame, fps, config: { stiffness: 200, damping: 15 } });

  // Title card: frames 90-600 (3-20 seconds)
  const titleProgress = spring({ frame: frame - 90, fps, config: { stiffness: 150, damping: 18 } });
  const titleY = interpolate(titleProgress, [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: 'clamp' });

  // CTA: last 60 frames (2 seconds)
  const ctaOpacity = interpolate(
    frame,
    [durationInFrames - 60, durationInFrames - 40],
    [0, 1],
    { extrapolateLeft: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background: config.gradient,
          opacity: 0.15,
        }}
      />

      {/* Hook - first 3 seconds */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: hookOpacity,
          }}
        >
          <div
            style={{
              transform: `scale(${hookScale})`,
              backgroundColor: accentColor,
              borderRadius: 24,
              padding: '40px 60px',
              maxWidth: '80%',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: config.font,
                fontSize: 72,
                fontWeight: 'bold',
                color: textColor,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {hookText}
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Main content */}
      <Sequence from={90}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
            opacity: titleOpacity,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              transform: `translateY(${titleY}px)`,
            }}
          >
            <h1
              style={{
                fontFamily: config.font,
                fontSize: 96,
                fontWeight: 900,
                color: textColor,
                margin: '0 0 40px',
                lineHeight: 1.1,
                textShadow: `0 4px 20px rgba(0,0,0,0.5)`,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontFamily: 'Arial',
                fontSize: 52,
                color: textColor,
                opacity: 0.85,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 12,
          background: accentColor,
        }}
      />

      {/* CTA */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: ctaOpacity,
        }}
      >
        <span
          style={{
            fontFamily: 'Arial',
            fontSize: 48,
            fontWeight: 'bold',
            color: accentColor,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '16px 48px',
            borderRadius: 60,
          }}
        >
          {callToAction}
        </span>
      </div>
    </AbsoluteFill>
  );
};
