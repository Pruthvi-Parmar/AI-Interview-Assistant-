/**
 * Advanced Interruption Handling Utilities for VAPI AI Interviewer
 * 
 * This module provides utilities for optimizing real-time speech interruption
 * handling to create natural, human-like conversation flows.
 */

export interface InterruptionConfig {
  // VAD (Voice Activity Detection) settings
  vadSensitivity: number; // 0.0 - 1.0, higher = more sensitive
  silenceThreshold: number; // milliseconds of silence before considering speech ended
  speechStartThreshold: number; // minimum audio level to trigger speech detection
  
  // Interruption timing settings
  maxInterruptionDelay: number; // maximum acceptable delay in ms
  speechCancellationTimeout: number; // timeout for TTS cancellation
  
  // Debugging settings
  enableLogging: boolean;
  enableMetrics: boolean;
}

export const DEFAULT_INTERRUPTION_CONFIG: InterruptionConfig = {
  vadSensitivity: 0.8,
  silenceThreshold: 150, // Reduced from typical 300ms for faster detection
  speechStartThreshold: 0.1,
  maxInterruptionDelay: 200, // Target: under 200ms interruption delay
  speechCancellationTimeout: 100,
  enableLogging: true,
  enableMetrics: true,
};

export interface InterruptionMetrics {
  totalInterruptions: number;
  averageInterruptionDelay: number;
  fastestInterruption: number;
  slowestInterruption: number;
  successfulCancellations: number;
  failedCancellations: number;
  lastInterruptionTime: number | null;
}

export class InterruptionHandler {
  private config: InterruptionConfig;
  private metrics: InterruptionMetrics;
  private interruptionTimes: number[] = [];

  constructor(config: Partial<InterruptionConfig> = {}) {
    this.config = { ...DEFAULT_INTERRUPTION_CONFIG, ...config };
    this.metrics = this.createEmptyMetrics();
  }

  private createEmptyMetrics(): InterruptionMetrics {
    return {
      totalInterruptions: 0,
      averageInterruptionDelay: 0,
      fastestInterruption: Infinity,
      slowestInterruption: 0,
      successfulCancellations: 0,
      failedCancellations: 0,
      lastInterruptionTime: null,
    };
  }

  /**
   * Records an interruption event and calculates metrics
   */
  recordInterruption(aiSpeechStartTime: number, userSpeechDetectedTime: number): void {
    const delay = userSpeechDetectedTime - aiSpeechStartTime;
    
    this.interruptionTimes.push(delay);
    this.metrics.totalInterruptions++;
    this.metrics.lastInterruptionTime = userSpeechDetectedTime;
    
    // Update delay metrics
    if (delay < this.metrics.fastestInterruption) {
      this.metrics.fastestInterruption = delay;
    }
    if (delay > this.metrics.slowestInterruption) {
      this.metrics.slowestInterruption = delay;
    }
    
    // Calculate average
    this.metrics.averageInterruptionDelay = 
      this.interruptionTimes.reduce((sum, time) => sum + time, 0) / this.interruptionTimes.length;

    if (this.config.enableLogging) {
      console.log(`🚨 Interruption recorded: ${delay}ms delay`, {
        total: this.metrics.totalInterruptions,
        average: Math.round(this.metrics.averageInterruptionDelay),
        fastest: Math.round(this.metrics.fastestInterruption),
        slowest: Math.round(this.metrics.slowestInterruption),
      });
    }
  }

  /**
   * Records a successful speech cancellation
   */
  recordSuccessfulCancellation(): void {
    this.metrics.successfulCancellations++;
    if (this.config.enableLogging) {
      console.log("✅ Speech successfully cancelled");
    }
  }

  /**
   * Records a failed speech cancellation
   */
  recordFailedCancellation(reason?: string): void {
    this.metrics.failedCancellations++;
    if (this.config.enableLogging) {
      console.warn("❌ Speech cancellation failed:", reason);
    }
  }

  /**
   * Gets current interruption metrics
   */
  getMetrics(): InterruptionMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets all metrics
   */
  resetMetrics(): InterruptionMetrics {
    this.interruptionTimes = [];
    this.metrics = this.createEmptyMetrics();
    return this.metrics;
  }

  /**
   * Determines if an interruption delay is acceptable
   */
  isAcceptableDelay(delay: number): boolean {
    return delay <= this.config.maxInterruptionDelay;
  }

  /**
   * Gets optimized VAPI transcriber configuration for interruption handling
   */
  getOptimizedTranscriberConfig() {
    return {
      provider: "deepgram" as const,
      model: "nova-2" as const,
      language: "en" as const,
      // Critical settings for fast interruption detection
      keywords: [
        // Common interruption words/sounds
        "hello", "hi", "yes", "no", "okay", "wait", "stop", "excuse me",
        "sorry", "actually", "well", "um", "uh", "but", "however"
      ],
      // Reduced endpointing for faster speech-end detection
      endpointing: this.config.silenceThreshold,
    };
  }

  /**
   * Gets optimized VAPI voice configuration for interruption handling
   */
  getOptimizedVoiceConfig() {
    return {
      provider: "11labs" as const,
      voiceId: "sarah" as const,
      stability: 0.4,
      similarityBoost: 0.8,
      speed: 1.1, // Slightly faster for quicker responses
      style: 0.5,
      useSpeakerBoost: true,
      // Critical: Enable streaming for faster audio generation and easier cancellation
      optimizeStreamingLatency: 4,
    };
  }

  /**
   * Creates a performance report
   */
  generatePerformanceReport(): string {
    const metrics = this.getMetrics();
    const successRate = metrics.totalInterruptions > 0 
      ? (metrics.successfulCancellations / metrics.totalInterruptions * 100).toFixed(1)
      : "0";

    return `
🎯 Interruption Performance Report
================================
Total Interruptions: ${metrics.totalInterruptions}
Average Delay: ${Math.round(metrics.averageInterruptionDelay)}ms
Fastest Interruption: ${Math.round(metrics.fastestInterruption)}ms
Slowest Interruption: ${Math.round(metrics.slowestInterruption)}ms
Success Rate: ${successRate}%
Target Delay: <${this.config.maxInterruptionDelay}ms

${metrics.averageInterruptionDelay <= this.config.maxInterruptionDelay 
  ? "✅ Performance is within target range" 
  : "⚠️ Performance needs improvement"}
    `.trim();
  }
}

/**
 * Enhanced VAPI message handler for interruption events
 */
export function createInterruptionAwareMessageHandler(
  handler: InterruptionHandler,
  onInterruption: () => void,
  onSpeechStart: () => void,
  onSpeechEnd: () => void
) {
  let aiSpeechStartTime: number | null = null;

  return (message: any) => {
    const timestamp = Date.now();

    // Track AI speech timing
    if (message.type === "speech-start" && message.role === "assistant") {
      aiSpeechStartTime = timestamp;
      onSpeechStart();
    }

    if (message.type === "speech-end" && message.role === "assistant") {
      aiSpeechStartTime = null;
      onSpeechEnd();
    }

    // Detect user interruptions with high precision
    if (message.type === "transcript" && message.role === "user") {
      if (message.transcriptType === "partial" && aiSpeechStartTime) {
        // User started speaking while AI was speaking
        handler.recordInterruption(aiSpeechStartTime, timestamp);
        onInterruption();
      }
    }

    // Handle explicit interruption events
    if (message.type === "user-interrupted") {
      if (aiSpeechStartTime) {
        handler.recordInterruption(aiSpeechStartTime, timestamp);
      }
      onInterruption();
    }

    // Handle voice input detection
    if (message.type === "voice-input" && aiSpeechStartTime) {
      handler.recordInterruption(aiSpeechStartTime, timestamp);
      onInterruption();
    }

    // Handle speech updates for fine-grained control
    if (message.type === "speech-update" && message.role === "user" && message.status === "started") {
      if (aiSpeechStartTime) {
        handler.recordInterruption(aiSpeechStartTime, timestamp);
        onInterruption();
      }
    }
  };
}

/**
 * Utility to create optimized VAPI assistant configuration
 */
export function createOptimizedAssistant(
  baseConfig: any,
  handler: InterruptionHandler
) {
  return {
    ...baseConfig,
    transcriber: {
      ...baseConfig.transcriber,
      ...handler.getOptimizedTranscriberConfig(),
    },
    voice: {
      ...baseConfig.voice,
      ...handler.getOptimizedVoiceConfig(),
    },
  };
}
