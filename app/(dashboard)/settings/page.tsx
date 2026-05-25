import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-zinc-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-8 text-center">
        <p className="text-zinc-400 text-sm">Restaurant settings coming in Phase 2.</p>
      </div>
    </div>
  );
}
