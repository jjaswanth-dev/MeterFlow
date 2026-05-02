"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "@/lib/auth-client";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface UsageLog {
  _id: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
}

export default function OverviewPage() {
  const [usage, setUsage] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchUsage = async () => {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      if (!session?.user?.id) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/api/analytics/usage?userId=${session.user.id}`);
        setUsage(res.data);
      } catch (error) {
        console.error("Failed to fetch usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [session?.user?.id]);

  // Aggregate usage by hour for the area chart
  const chartData = usage.reduce<{ time: string; requests: number; latency: number }[]>((acc, log) => {
    const hour = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existing = acc.find(d => d.time === hour);
    if (existing) {
      existing.requests += 1;
      existing.latency = Math.round((existing.latency + log.latencyMs) / 2);
    } else {
      acc.push({ time: hour, requests: 1, latency: log.latencyMs });
    }
    return acc;
  }, []);

  // Aggregate by status code for bar chart
  const statusData = usage.reduce<{ status: string; count: number }[]>((acc, log) => {
    const label = `${log.statusCode}`;
    const existing = acc.find(d => d.status === label);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ status: label, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => a.status.localeCompare(b.status));

  // Aggregate by endpoint for bar chart
  const endpointData = usage.reduce<{ endpoint: string; count: number }[]>((acc, log) => {
    const path = log.endpoint || "unknown";
    const existing = acc.find(d => d.endpoint === path);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ endpoint: path, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.count - a.count).slice(0, 8);

  const totalRequests = usage.length;
  const avgLatency = usage.length > 0
    ? Math.round(usage.reduce((acc, curr) => acc + curr.latencyMs, 0) / usage.length)
    : 0;
  const errorCount = usage.filter(l => l.statusCode >= 400).length;
  const errorRate = usage.length > 0 ? ((errorCount / usage.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome back, {session?.user?.name || "User"}. Here is what is happening with your APIs.</p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Requests</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? "..." : totalRequests}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Average Latency</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? "..." : `${avgLatency} ms`}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Error Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? "..." : `${errorRate}%`}</p>
        </div>
      </div>

      {usage.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-blue-700">
          <p className="font-medium">No usage data yet.</p>
          <p className="text-sm mt-1">Start making requests through the gateway to see analytics here.</p>
        </div>
      )}

      {/* Area Chart — Requests Over Time */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Requests Over Time</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bar Charts Row */}
      {usage.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Code Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Response Status Codes</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="status" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Top Endpoints</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={endpointData} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="endpoint" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
