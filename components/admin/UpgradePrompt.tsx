"use client";
import React from 'react';

interface UpgradePromptProps {
  featureName: string;
  onClose?: () => void;
}

export function UpgradePrompt({ featureName, onClose }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
          <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-zinc-900 font-[var(--display)] mb-2">Upgrade to unlock {featureName}</h3>
        <p className="text-sm text-zinc-500 mb-6 font-[var(--sans)]">
          This feature is not available on the Starter plan. Upgrade your plan to get access to advanced features and grow your restaurant.
        </p>
        <div className="flex gap-3 justify-center">
          {onClose && (
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <a 
            href="/dashboard/settings?tab=billing"
            className="px-4 py-2 rounded-md bg-[#FF4D3D] text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    </div>
  );
}
