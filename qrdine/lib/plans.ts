import { PlanType } from "@prisma/client";

export interface PlanLimits {
  maxTables: number;
  maxMenuItems: number;
  gamesEnabled: boolean;
  analyticsRetentionDays: number;
  bluetoothPrinting: boolean;
  whatsappBilling: boolean;
  prioritySupport: boolean;
  monthlyPrice: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.starter]: {
    maxTables: 5,
    maxMenuItems: 30,
    gamesEnabled: false,
    analyticsRetentionDays: 30,
    bluetoothPrinting: false,
    whatsappBilling: false,
    prioritySupport: false,
    monthlyPrice: 0,
  },
  [PlanType.growth]: {
    maxTables: 20,
    maxMenuItems: 200,
    gamesEnabled: true,
    analyticsRetentionDays: 90,
    bluetoothPrinting: true,
    whatsappBilling: true,
    prioritySupport: false,
    monthlyPrice: 999,
  },
  [PlanType.pro]: {
    maxTables: 999,
    maxMenuItems: 999,
    gamesEnabled: true,
    analyticsRetentionDays: 365,
    bluetoothPrinting: true,
    whatsappBilling: true,
    prioritySupport: true,
    monthlyPrice: 2499,
  },
};
