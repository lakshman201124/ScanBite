"use client";

import { useRef, useCallback } from "react";
import type { BillPrintInput } from "@/lib/printer/bill";
import type { KOTInput } from "@/lib/printer/kot";

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: object): Promise<BluetoothDevice>;
    };
  }
  interface BluetoothDevice {
    name?: string;
    gatt?: {
      connect(): Promise<BluetoothRemoteGATTServer>;
    };
  }
  interface BluetoothRemoteGATTServer {
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  interface BluetoothRemoteGATTCharacteristic {
    writeValue(data: ArrayBuffer): Promise<void>;
  }
}

const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHAR    = "00002af1-0000-1000-8000-00805f9b34fb";
const CHUNK_SIZE = 512;
const CHUNK_DELAY_MS = 50;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendToDevice(char: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    await char.writeValue(chunk.buffer);
    await sleep(CHUNK_DELAY_MS);
  }
}

export function usePrinter() {
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const charRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const isSupported = typeof navigator !== "undefined" && !!navigator.bluetooth;

  async function getChar(): Promise<BluetoothRemoteGATTCharacteristic> {
    if (charRef.current) return charRef.current;
    if (!navigator.bluetooth) throw new Error("Web Bluetooth not supported on this browser");

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [PRINTER_SERVICE] }],
      optionalServices: [PRINTER_SERVICE],
    });
    deviceRef.current = device;
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(PRINTER_SERVICE);
    const char = await service.getCharacteristic(PRINTER_CHAR);
    charRef.current = char;
    return char;
  }

  const printBuffer = useCallback(async (data: Uint8Array): Promise<boolean> => {
    try {
      const char = await getChar();
      await sendToDevice(char, data);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("cancelled") || msg.includes("chosen")) {
        charRef.current = null; // Device picker cancelled
      } else {
        charRef.current = null; // Connection lost — reset for retry
        console.error("[usePrinter]", msg);
      }
      return false;
    }
  }, []);

  const printKOT = useCallback(async (input: KOTInput): Promise<boolean> => {
    const { buildKOTBuffer } = await import("@/lib/printer/kot");
    const buffer = buildKOTBuffer(input);
    return printBuffer(buffer);
  }, [printBuffer]);

  const printBill = useCallback(async (input: BillPrintInput): Promise<boolean> => {
    const { buildBillBuffer } = await import("@/lib/printer/bill");
    const buffer = buildBillBuffer(input);
    return printBuffer(buffer);
  }, [printBuffer]);

  const forgetPrinter = useCallback(() => {
    deviceRef.current = null;
    charRef.current = null;
  }, []);

  const printerName = deviceRef.current?.name ?? null;

  return { isSupported, printKOT, printBill, forgetPrinter, printerName };
}
