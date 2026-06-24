import React from 'react';
import { Composition } from 'remotion';
import { ShortFormVideo, SHORT_FORM_PROPS } from './compositions/ShortFormVideo';
import { LongFormVideo, LONG_FORM_PROPS } from './compositions/LongFormVideo';
import { ExtendedVideo, EXTENDED_PROPS } from './compositions/ExtendedVideo';

export const Root: React.FC = () => {
  return (
    <>
      {/* Short-form: 30s, 9:16 portrait (TikTok/Shorts/Reels) */}
      <Composition
        id="ShortFormVideo"
        component={ShortFormVideo}
        durationInFrames={30 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SHORT_FORM_PROPS}
      />

      {/* Long-form: 60s, 16:9 landscape (YouTube) */}
      <Composition
        id="LongFormVideo"
        component={LongFormVideo}
        durationInFrames={60 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={LONG_FORM_PROPS}
      />

      {/* Extended: 10 minutes, 16:9 landscape (YouTube long-form) */}
      <Composition
        id="ExtendedVideo"
        component={ExtendedVideo}
        durationInFrames={600 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={EXTENDED_PROPS}
      />
    </>
  );
};
