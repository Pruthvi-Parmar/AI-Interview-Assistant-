/**
 * Setup script for Adaptive Interview Flow
 * This script ensures the database collections and indexes are properly configured
 */

import { db } from '../firebase/admin';
import { AdaptiveFlowState, QuestionRecord, ResponseAnalysis } from '../types/index.d.ts';

async function setupAdaptiveFlowCollections() {
  console.log('🚀 Setting up Adaptive Interview Flow database collections...');

  try {
    // Create adaptive_flow_states collection with sample document to establish schema
    const sampleFlowState: AdaptiveFlowState = {
      sessionId: 'sample_session',
      currentDifficulty: 5,
      baseDifficulty: 5,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      totalQuestions: 10,
      questionsAsked: 0,
      mvpKeywords: [],
      role: 'Sample Role',
      techStack: ['Sample Tech'],
      questionHistory: [],
      lastAnalysis: {
        mvpKeywords: [],
        confidence: 5,
        technicalAccuracy: 5,
        completeness: 5,
        overallScore: 5,
        suggestedNextDifficulty: 5,
        reasoning: 'Sample analysis'
      }
    };

    // Add sample document to establish collection
    await db.collection('adaptive_flow_states').doc('sample').set(sampleFlowState);
    console.log('✅ Created adaptive_flow_states collection');

    // Clean up sample document
    await db.collection('adaptive_flow_states').doc('sample').delete();

    // Update interview_sessions collection to support adaptive flow
    const sessionsRef = db.collection('interview_sessions');
    
    // Add indexes for better performance (these need to be created in Firebase Console)
    console.log('📋 Recommended Firestore indexes to create in Firebase Console:');
    console.log('Collection: adaptive_flow_states');
    console.log('  - Single field index on: sessionId (Ascending)');
    console.log('  - Single field index on: role (Ascending)');
    console.log('  - Single field index on: currentDifficulty (Ascending)');
    console.log('');
    console.log('Collection: interview_sessions');
    console.log('  - Composite index on: userId (Ascending), status (Ascending)');
    console.log('  - Composite index on: templateId (Ascending), status (Ascending)');

    // Create a sample adaptive flow session document to show the extended schema
    const sampleSession = {
      id: 'sample_adaptive_session',
      templateId: 'sample_template',
      userId: 'sample_user',
      status: 'pending' as const,
      startTime: new Date().toISOString(),
      duration: 30,
      questions: ['Sample question 1', 'Sample question 2'],
      transcript: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Adaptive flow specific fields
      useAdaptiveFlow: true,
      adaptiveFlowStateId: 'sample_session',
      currentDifficulty: 5,
      mvpKeywords: [],
    };

    await db.collection('interview_sessions').doc('sample_adaptive').set(sampleSession);
    console.log('✅ Updated interview_sessions schema for adaptive flow');

    // Clean up sample document
    await db.collection('interview_sessions').doc('sample_adaptive').delete();

    console.log('🎉 Adaptive Interview Flow database setup completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Create the recommended indexes in Firebase Console');
    console.log('2. Test the adaptive flow with a real interview session');
    console.log('3. Monitor performance and adjust difficulty algorithms as needed');

  } catch (error) {
    console.error('❌ Error setting up adaptive flow collections:', error);
    throw error;
  }
}

// Export for use in other scripts
export { setupAdaptiveFlowCollections };

// Run if called directly
if (require.main === module) {
  setupAdaptiveFlowCollections()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}
