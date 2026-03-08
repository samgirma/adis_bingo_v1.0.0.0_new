// Prisma schema - replacing drizzle-orm
export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  name: string;
  email?: string;
  accountNumber?: string;
  balance: number;
  isBlocked: boolean;
  creditBalance: number;
  totalRevenue: number;
  totalGames: number;
  totalPlayers: number;
  machineId?: string;
  createdAt: Date;
}

export interface Game {
  id: number;
  employeeId: number;
  status: 'waiting' | 'active' | 'completed' | 'paused';
  prizePool: number;
  entryFee: number;
  calledNumbers: string;
  winnerId?: number;
  startedAt?: Date;
  completedAt?: Date;
  isPaused: boolean;
  createdAt: Date;
}

export interface GamePlayer {
  id: number;
  gameId: number;
  playerName: string;
  cartelaNumbers: string;
  entryFee: number;
  isWinner: boolean;
  registeredAt: Date;
}

export interface Transaction {
  id: number;
  userId?: number;
  amount: number;
  type: 'entry_fee' | 'prize_payout' | 'admin_profit' | 'credit_load' | 'game_fee';
  description?: string;
  createdAt: Date;
}

export interface GameHistory {
  id: number;
  gameId?: number;
  userId?: number;
  action: string;
  details?: string;
  createdAt: Date;
}

export interface UsedRecharge {
  id: number;
  nonce: string;
  signature: string;
  amount: number;
  userId: number;
  machineId: string;
  usedAt: Date;
}

export interface Cartela {
  id: number;
  employeeId: number;
  cartelaNumber: number;
  cardNo: number;
  name: string;
  pattern: string;
  isHardcoded: boolean;
  isActive: boolean;
  isBooked: boolean;
  bookedBy?: number;
  gameId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyRevenueSummary {
  id: number;
  date: string;
  employeeId?: number;
  totalAdminRevenue: number;
  totalGamesPlayed: number;
  totalPlayersRegistered: number;
  createdAt: Date;
  updatedAt: Date;
}

// Insert types
export interface InsertUser {
  username: string;
  password: string;
  role?: 'admin' | 'employee';
  name: string;
  email?: string;
  accountNumber?: string;
  balance?: number;
  isBlocked?: boolean;
  creditBalance?: number;
  totalRevenue?: number;
  totalGames?: number;
  totalPlayers?: number;
  machineId?: string;
}

export interface InsertGame {
  employeeId: number;
  status?: 'waiting' | 'active' | 'completed' | 'paused';
  prizePool?: number;
  entryFee: number;
  calledNumbers?: string;
  winnerId?: number;
  isPaused?: boolean;
}

export interface InsertGamePlayer {
  gameId: number;
  playerName: string;
  cartelaNumbers: string;
  entryFee: number;
  isWinner?: boolean;
}

export interface InsertTransaction {
  userId?: number;
  amount: number;
  type: 'entry_fee' | 'prize_payout' | 'admin_profit' | 'credit_load' | 'game_fee';
  description?: string;
}

export interface InsertGameHistory {
  gameId?: number;
  userId?: number;
  action: string;
  details?: string;
}

export interface InsertCartela {
  employeeId: number;
  cartelaNumber: number;
  cardNo: number;
  name: string;
  pattern: string;
  isHardcoded?: boolean;
  isActive?: boolean;
  isBooked?: boolean;
  bookedBy?: number;
  gameId?: number;
}

export interface InsertDailyRevenueSummary {
  date: string;
  employeeId?: number;
  totalAdminRevenue: number;
  totalGamesPlayed: number;
  totalPlayersRegistered: number;
}
