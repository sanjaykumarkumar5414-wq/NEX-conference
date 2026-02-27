import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type ReportType = "weekly" | "monthly" | "yearly";

interface ReportsPanelProps {}

function todayDateStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate()
  ).padStart(2, "0")}`;
}

function currentMonthStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportsPanel(_props: ReportsPanelProps) {
  const { token } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("weekly");
  const [weekDate, setWeekDate] = useState(todayDateStr);
  const [monthValue, setMonthValue] = useState(currentMonthStr);
  const [yearValue, setYearValue] = useState(() => new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - 2 + i);
  }, []);

  const handleDownload = async (format: "excel" | "pdf") => {
    if (!token) {
      setError("You must be signed in as HR to download reports.");
      return;
    }
    setError(null);

    const params = new URLSearchParams();
    params.set("type", reportType);
    params.set("format", format);

    if (reportType === "weekly") {
      if (!weekDate) {
        setError("Please select a week date.");
        return;
      }
      params.set("date", weekDate);
    } else if (reportType === "monthly") {
      if (!monthValue) {
        setError("Please select a month.");
        return;
      }
      const [y, m] = monthValue.split("-");
      params.set("year", y);
      params.set("month", m);
    } else if (reportType === "yearly") {
      if (!yearValue) {
        setError("Please select a year.");
        return;
      }
      params.set("year", String(yearValue));
    }

    const fileLabel =
      reportType === "weekly"
        ? weekDate
        : reportType === "monthly"
          ? monthValue
          : String(yearValue);

    setDownloading(format);
    try {
      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ??
            "Failed to generate report. Please try again."
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-report-${reportType}-${fileLabel}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download report. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-[11px]">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Reports</h2>
          <p className="text-xs text-slate-400">
            Export booking activity for a selected week, month, or year.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-end">
        <div className="space-y-1">
          <label htmlFor="report-type" className="block text-slate-200">
            Report type
          </label>
          <select
            id="report-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-200">
            {reportType === "weekly"
              ? "Week (pick any day)"
              : reportType === "monthly"
                ? "Month"
                : "Year"}
          </label>
          {reportType === "weekly" && (
            <input
              type="date"
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          )}
          {reportType === "monthly" && (
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          )}
          {reportType === "yearly" && (
            <select
              value={yearValue}
              onChange={(e) => setYearValue(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleDownload("excel")}
          disabled={downloading !== null}
          className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
        >
          {downloading === "excel" ? "Downloading…" : "Download Excel"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("pdf")}
          disabled={downloading !== null}
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-900 shadow-lg shadow-slate-200/40 hover:bg-white disabled:opacity-60"
        >
          {downloading === "pdf" ? "Downloading…" : "Download PDF"}
        </button>
        {error && (
          <span className="text-[11px] text-red-300">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}

