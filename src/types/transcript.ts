export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
  duration: number;
  offset: number;
  lang: string;
}
