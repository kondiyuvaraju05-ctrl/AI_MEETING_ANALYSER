import React, { useState } from "react";
import { RecordItem } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { LayoutDashboard, Clock, CheckCircle2, ListTodo, TrendingUp, Filter, Sparkles } from "lucide-react";

interface AnalyticsDashboardProps {
  meetings: RecordItem[];
}

export default function AnalyticsDashboard({ meetings }: AnalyticsDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Exclude soft-deleted meetings
  const activeMeetings = meetings.filter((m) => !m.isDeleted);

  const filteredMeetings = selectedCategory === "All"
    ? activeMeetings
    : activeMeetings.filter((m) => m.category === selectedCategory);

  // Compute key summary metrics
  const totalMeetings = filteredMeetings.length;
  const totalDurationSeconds = filteredMeetings.reduce((acc, m) => acc + (m.duration || 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60);

  let totalActionItems = 0;
  let completedActionItems = 0;
  filteredMeetings.forEach((m) => {
    if (m.actionItems) {
      totalActionItems += m.actionItems.length;
      completedActionItems += m.actionItems.filter((a) => a.completed).length;
    }
  });

  const completionRate = totalActionItems > 0
    ? Math.round((completedActionItems / totalActionItems) * 100)
    : 0;

  // Chart Data 1: Category Distribution
  const categoryCounts: Record<string, number> = {
    Engineering: 0,
    Marketing: 0,
    Infrastructure: 0,
    Sales: 0,
    General: 0,
  };

  activeMeetings.forEach((m) => {
    const cat = m.category || "General";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    value: categoryCounts[cat],
  }));

  const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6"];

  // Chart Data 2: Meeting Duration Trend
  const durationData = filteredMeetings.slice(0, 7).reverse().map((m, idx) => ({
    name: m.title.length > 15 ? m.title.substring(0, 15) + "..." : m.title,
    durationMinutes: Math.round((m.duration || 120) / 60),
    actionItemsCount: m.actionItems ? m.actionItems.length : 0,
  }));

  // Chart Data 3: Task Status Breakdown
  const taskStatusData = [
    { name: "Completed Tasks", value: completedActionItems, color: "#10b981" },
    { name: "Pending Tasks", value: Math.max(0, totalActionItems - completedActionItems), color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Meeting Analytics & Productivity</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                Recharts Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Data-driven insights into team meeting duration, category breakdown, and task completion.
            </p>
          </div>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs text-slate-400 font-semibold">Filter:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Categories</option>
            <option value="Engineering" className="bg-slate-900">Engineering</option>
            <option value="Marketing" className="bg-slate-900">Marketing</option>
            <option value="Infrastructure" className="bg-slate-900">Infrastructure</option>
            <option value="Sales" className="bg-slate-900">Sales</option>
            <option value="General" className="bg-slate-900">General</option>
          </select>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Meetings */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Meetings</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalMeetings}</div>
          <p className="text-[11px] text-slate-400">Indexed & summarized</p>
        </div>

        {/* Card 2: Cumulative Duration */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Duration</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalMinutes} <span className="text-sm text-slate-400 font-normal">mins</span></div>
          <p className="text-[11px] text-slate-400">Recorded audio & minutes</p>
        </div>

        {/* Card 3: Action Items */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Action Items</span>
            <ListTodo className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalActionItems}</div>
          <p className="text-[11px] text-slate-400">{completedActionItems} completed</p>
        </div>

        {/* Card 4: Productivity Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Task Productivity</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{completionRate}%</div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Meeting Duration Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Meeting Duration (Minutes)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Recent sessions</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                />
                <Bar dataKey="durationMinutes" name="Duration (min)" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Distribution Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Activity Distribution by Category</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Category breakdown</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-300 font-semibold">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
