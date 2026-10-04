import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Game, BallRecord } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  liveGames: Record<string, Game>;
  lastBall: BallRecord | null;
  activeGameId: string | null;
  onlineCount: number;
  setActiveGameId: (id: string | null) => void;
  updateGameLocally: (id: string, updates: Partial<Game>) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [liveGames, setLiveGames] = useState<Record<string, Game>>({});
  const [lastBall, setLastBall] = useState<BallRecord | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = () => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
    }
  };

  const handleMessage = (msg: { type: string; payload: any }) => {
    const { type, payload } = msg;

    switch (type) {
      case 'INITIAL_SYNC': {
        const map: Record<string, Game> = {};
        for (const g of payload.games || []) {
          map[g.id] = g;
        }
        setLiveGames(map);
        if (payload.onlineCount !== undefined) {
          setOnlineCount(payload.onlineCount);
        }
        if (!activeGameId && payload.games?.[0]) {
          setActiveGameId(payload.games[0].id);
        }
        break;
      }

      case 'ONLINE_COUNT': {
        setOnlineCount(payload.count);
        break;
      }

      case 'TIMER_TICK': {
        setLiveGames((prev) => {
          const current = prev[payload.gameId];
          if (!current) return prev;
          return {
            ...prev,
            [payload.gameId]: {
              ...current,
              remaining_seconds: payload.remainingSeconds,
              status: payload.status,
            },
          };
        });
        break;
      }

      case 'NEW_MATCH_STARTED': {
        if (payload.game) {
          setLiveGames((prev) => ({
            ...prev,
            [payload.game.id]: payload.game,
          }));
          setActiveGameId(payload.game.id);
        }
        break;
      }

      case 'STATE_CHANGE': {
        if (payload.status === 'OPEN' && payload.game) {
          setActiveGameId(payload.game.id);
        }
        setLiveGames((prev) => {
          const current = prev[payload.gameId];
          if (!current && !payload.game) return prev;
          return {
            ...prev,
            [payload.gameId]: {
              ...(current || {}),
              ...(payload.game || {}),
              status: payload.status,
            },
          };
        });
        break;
      }

      case 'BALL_RESULT': {
        setLastBall(payload.ball);
        setLiveGames((prev) => {
          const current = prev[payload.gameId];
          if (!current) return prev;

          const existingBalls = current.balls || [];
          const exists = existingBalls.some((b) => b.id === payload.ball.id);
          const newBalls = exists ? existingBalls : [...existingBalls, payload.ball];

          return {
            ...prev,
            [payload.gameId]: {
              ...current,
              current_innings: payload.innings,
              current_ball_index: payload.ballNumber,
              team_a_score: payload.innings === 1 ? payload.currentScore : current.team_a_score,
              team_a_wickets: payload.innings === 1 ? payload.currentWickets : current.team_a_wickets,
              team_b_score: payload.innings === 2 ? payload.currentScore : current.team_b_score,
              team_b_wickets: payload.innings === 2 ? payload.currentWickets : current.team_b_wickets,
              balls: newBalls,
              ...(payload.game || {}),
            },
          };
        });
        break;
      }

      case 'GAME_COMPLETED': {
        setLiveGames((prev) => {
          const current = prev[payload.gameId];
          if (!current) return prev;
          return {
            ...prev,
            [payload.gameId]: {
              ...current,
              status: 'COMPLETED',
              winner: payload.winner,
              win_margin: payload.winMargin,
              is_tie: payload.isTie,
              server_seed: payload.serverSeed,
              is_seed_revealed: true,
              ...(payload.game || {}),
            },
          };
        });
        break;
      }
    }
  };

  const updateGameLocally = (id: string, updates: Partial<Game>) => {
    setLiveGames((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...updates,
        },
      };
    });
  };

  const fetchInitialGames = async () => {
    try {
      const res = await fetch('/api/games');
      const json = await res.json();
      if (json.success && json.data) {
        setLiveGames((prev) => {
          const map: Record<string, Game> = { ...prev };
          for (const g of json.data) {
            if (!map[g.id]) {
              map[g.id] = g;
            } else {
              map[g.id] = { ...g, ...map[g.id] };
            }
          }
          return map;
        });
        const liveMatch = json.data.find(
          (g: Game) =>
            g.status === 'OPEN' ||
            g.status === 'INNINGS_1' ||
            g.status === 'INNINGS_2' ||
            g.status === 'LOCKED' ||
            g.status === 'INNINGS_BREAK'
        );
        const currentSelectedGame = json.data.find((g: Game) => g.id === activeGameId);
        if (liveMatch && (!activeGameId || currentSelectedGame?.status === 'COMPLETED')) {
          setActiveGameId(liveMatch.id);
        } else if (!activeGameId && json.data[0]) {
          setActiveGameId(json.data[0].id);
        }
      }
    } catch (e) {
      console.warn('Initial games fetch failed:', e);
    }
  };

  useEffect(() => {
    fetchInitialGames();
    connectWebSocket();

    // Fallback polling every 4s if WebSocket is disconnected or in case of missed ticks
    const fallbackPoll = setInterval(() => {
      fetchInitialGames();
    }, 4000);

    return () => {
      clearInterval(fallbackPoll);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        liveGames,
        lastBall,
        activeGameId,
        onlineCount,
        setActiveGameId,
        updateGameLocally,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};
