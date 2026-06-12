import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface ImportWizardProps {
  type: "students" | "courses" | "grades";
  onCancel: () => void;
  onComplete: () => void;
}

type Step = "upload" | "preview" | "processing";

export const ImportWizard: React.FC<ImportWizardProps> = ({
  type,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(selected.type)) {
      setError(t("invalidFileFormat", { ns: "export" }));
      return;
    }

    if (selected.size > 50 * 1024 * 1024) {
      setError(t("fileTooLarge", { ns: "export" }));
      return;
    }

    setFile(selected);
    setError(null);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setStep("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use correct endpoint based on type (students, courses, grades)
      const endpoint = `/api/v1/import-export/imports/${type}`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t("uploadFailed", { ns: "export" }));
      }

      const result = await response.json();
      const jobId = result.data?.id;

      if (!jobId) {
        throw new Error("No job ID returned from server");
      }

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      while (!completed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const statusResponse = await fetch(`/api/v1/import-export/imports/${jobId}`);
        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();
        const job = statusData.data;

        if (job) {
          const progress = job.total_rows > 0
            ? ((job.successful_rows + job.failed_rows) / job.total_rows) * 100
            : 0;
          setProgress(Math.min(progress, 100));

          if (job.status === "completed" || job.status === "ready") {
            completed = true;
          } else if (job.status === "failed") {
            throw new Error(job.error_message || t("importFailed", { ns: "export" }));
          }
        }
      }

      if (!completed) {
        throw new Error(t("importTimeout", { ns: "export" }));
      }

      onComplete();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError", { ns: "common" }));
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    setStep("upload");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            {t("importWizard", { ns: "export" })}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(`import${type.charAt(0).toUpperCase() + type.slice(1)}`, {
              ns: "export",
            })}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {t("dragDropFile", { ns: "export" })}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {t("selectFile", { ns: "export" })}
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {t("supportedFormats", { ns: "export" })}: CSV, Excel | {t("maxSize", { ns: "export" })}: 50MB
            </div>
          </div>
        )}

        {step === "preview" && file && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">
                {t("selectedFile", { ns: "export" })}:
              </p>
              <p className="text-sm text-gray-600 mt-1">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                {t("readyToImport", { ns: "export" })}
              </p>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">
                {t("processing", { ns: "export" })}...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-3 flex gap-3 justify-end">
        {(step === "upload" || step === "preview") && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t("cancel", { ns: "common" })}
          </button>
        )}
        {step === "preview" && (
          <>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t("selectDifferent", { ns: "export" })}
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {t("import", { ns: "common" })}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportWizard;
