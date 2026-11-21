"use client";

import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Transaction, TransactionCategory, CATEGORY_COLORS, ALL_CATEGORIES, CATEGORY_SUBCATEGORIES } from "@/types";
import { formatINR, formatDate, confidenceColor } from "@/lib/utils";
import CategoryBadge from "@/components/CategoryBadge";

type Step = "upload" | "processing" | "review" | "done";

export default function UploadPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<Transaction[]>([]);
  const [overrides, setOverrides] = useState<Record<string, TransactionCategory>>({});
  const [subOverrides, setSubOverrides] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, []);

  const processScreenshot = async () => {
    if (!file) return;
    setStep("processing");
    setError(null);
    try {
      const result = await api.uploadScreenshot(file);
      setConfirmed(result.confirmed);
      setPending(result.pending_review);
      setStep("review");
    } catch (e: any) {
      setError(e.message || "Processing failed");
      setStep("upload");
    }
  };

  const confirmOne = async (txn: Transaction) => {
    setConfirming((s) => new Set([...s, txn.id]));
    try {
      await api.confirmReview({
        transaction_id: txn.id,
        new_category: overrides[txn.id] || txn.category,
        new_sub_category: subOverrides[txn.id],
      });
      setPending((p) => p.filter((t) => t.id !== txn.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming((s) => { const n = new Set(s); n.delete(txn.id); return n; });
    }
  };

  const confirmAll = async () => {
    for (const txn of pending) await confirmOne(txn);
    if (pending.length === 0) setStep("done");
  };

  if (pending.length === 0 && step === "review") setStep("done");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload GPay Screenshot</h1>
        <p className="text-slate-400 text-sm mt-1">AI will extract and categorize your transactions automatically</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {["Upload", "Processing", "Review & Confirm", "Done"].map((s, i) => {
          const steps = ["upload", "processing", "review", "done"];
          const isCurrent = step === steps[i];
          const isDone = ["upload", "processing", "review", "done"].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`flex items-center gap-1 ${isCurrent ? "text-emerald-400 font-medium" : isDone ? "text-slate-500 line-through" : ""}`}>
                {isDone ? <CheckCircle className="w-3 h-3" /> : null}
                {s}
              </span>
              {i < 3 && <ChevronRight className="w-3 h-3 text-slate-600" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Upload Zone */}
      {(step === "upload") && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-emerald-500 bg-emerald-500/10"
                : file
                ? "border-slate-600 bg-navy-800"
                : "border-slate-600 hover:border-slate-500 bg-navy-800 hover:bg-slate-800/50"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain" />
                <div className="text-sm text-slate-400">{file?.name} ({((file?.size || 0) / 1024).toFixed(0)} KB)</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <div className="text-white font-medium">Drop your GPay screenshot here</div>
                  <div className="text-slate-400 text-sm mt-1">or click to browse — PNG, JPG, WebP up to 10MB</div>
                </div>
              </div>
            )}
          </div>

          {file && (
            <button
              onClick={processScreenshot}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              Analyze with AI
            </button>
          )}
        </div>
      )}

      {/* Processing */}
      {step === "processing" && (
        <div className="rounded-xl bg-navy-800 border border-slate-700/50 p-16 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <div className="text-white font-medium">Analyzing screenshot with AI...</div>
          <div className="text-slate-400 text-sm">Extracting transactions and classifying categories</div>
        </div>
      )}

      {/* Review */}
      {step === "review" && (
        <div className="space-y-4">
          {/* Auto-confirmed */}
          {confirmed.length > 0 && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm mb-3">
                <CheckCircle className="w-4 h-4" />
                {confirmed.length} transactions auto-confirmed (high confidence)
              </div>
              <div className="space-y-1">
                {confirmed.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b border-emerald-500/10 last:border-0">
                    <span className="text-slate-300">{t.merchant}</span>
                    <div className="flex items-center gap-3">
                      <CategoryBadge category={t.category} size="sm" />
                      <span className="text-white font-medium">{formatINR(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Review */}
          {pending.length > 0 && (
            <div className="rounded-xl bg-navy-800 border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                <div className="font-medium text-white text-sm">
                  {pending.length} transactions need your review
                </div>
                <button
                  onClick={confirmAll}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all"
                >
                  Confirm All As-Is
                </button>
              </div>

              <div className="divide-y divide-slate-700/30">
                {pending.map((txn) => {
                  const selectedCat = overrides[txn.id] || txn.category;
                  const isConfirming = confirming.has(txn.id);
                  return (
                    <div key={txn.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-white">{txn.merchant}</div>
                          <div className="text-sm text-slate-400 mt-0.5">
                            {formatDate(txn.date)} · {formatINR(txn.amount)}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(txn.confidence)}`}>
                          {(txn.confidence * 100).toFixed(0)}% confident
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 italic">AI: &ldquo;{txn.reasoning}&rdquo;</div>

                      <div className="flex items-center gap-3">
                        <select
                          value={selectedCat}
                          onChange={(e) => setOverrides((o) => ({ ...o, [txn.id]: e.target.value as TransactionCategory }))}
                          className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        >
                          {ALL_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.replace("_", " ")}</option>
                          ))}
                        </select>
                        <select
                          value={subOverrides[txn.id] || ""}
                          onChange={(e) => setSubOverrides((s) => ({ ...s, [txn.id]: e.target.value }))}
                          className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">Sub-category</option>
                          {CATEGORY_SUBCATEGORIES[selectedCat].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => confirmOne(txn)}
                          disabled={isConfirming}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-1.5 transition-all"
                        >
                          {isConfirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Confirm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="rounded-xl bg-navy-800 border border-emerald-500/30 p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">All done!</div>
            <div className="text-slate-400 text-sm mt-1">
              {confirmed.length + (pending.length)} transactions saved successfully
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all"
            >
              View Dashboard
            </Link>
            <button
              onClick={() => { setStep("upload"); setFile(null); setPreview(null); setConfirmed([]); setPending([]); }}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

