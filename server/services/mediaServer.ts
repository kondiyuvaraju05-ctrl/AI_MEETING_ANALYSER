export interface SFUPipelineStats {
  streamId: string;
  activeForwarders: string[];
  inboundKbps: number;
  outboundKbps: number;
  packetLoss: number;
}

export const mediaServer = {
  // Simulate routing tracks from active speaker to subscribers
  async registerStreamTrack(streamId: string, participants: string[]): Promise<SFUPipelineStats> {
    console.log(`[SFU Media Server] Multiplexing inbound stream [${streamId}] to participants: ${participants.join(", ")}`);
    
    // Simulate pipeline configuration latency
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      streamId,
      activeForwarders: participants,
      inboundKbps: 250, // Average audio/video bitrate
      outboundKbps: 250 * participants.length,
      packetLoss: 0.01 // Mocked packet loss metrics
    };
  },

  async pipeStreamToRecorder(streamId: string): Promise<boolean> {
    console.log(`[SFU Media Server] Opening recording stream pipe [${streamId}] to Gemini Analyzer Engine...`);
    await new Promise(resolve => setTimeout(resolve, 80));
    return true;
  }
};
