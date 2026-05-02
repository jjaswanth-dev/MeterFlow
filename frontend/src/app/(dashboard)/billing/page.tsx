"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Receipt, CheckCircle, Clock } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface BillingRecord {
  _id: string;
  apiId: { name: string; _id: string };
  billingMonth: string;
  totalRequests: number;
  billableRequests: number;
  amountDue: number;
  status: "pending" | "paid";
}

export default function BillingPage() {
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    const fetchBilling = async () => {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      if (!session?.user?.id) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/api/billing?userId=${session.user.id}`);
        setBills(res.data);
      } catch (err) {
        console.error("Auth error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, [session?.user?.id]);

  const calculateTotalDue = () => {
    return bills
      .filter(b => b.status === "pending")
      .reduce((sum, bill) => sum + bill.amountDue, 0) / 100; // convert paise to INR/Dollars
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Billing & Usage</h2>
        <p className="text-gray-500">View your current month&apos;s usage and outstanding balances.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center">
        <div>
          <p className="text-blue-100 font-medium mb-1">Total Outstanding Due</p>
          <div className="text-4xl font-bold">
            ${calculateTotalDue().toFixed(2)}
          </div>
          <p className="text-sm text-blue-200 mt-2">For the billing cycle of May 2026</p>
        </div>
        <div className="mt-6 md:mt-0">
          {/* Note: Payment Gateway removed as per user request */}
          <button className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold shadow-md hover:bg-gray-50 transition-colors disabled:opacity-50" disabled={calculateTotalDue() === 0}>
            Pay Invoice Now
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
            <Receipt size={20} className="text-gray-500" />
            <span>Recent Invoices</span>
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading invoices...</div>
          ) : bills.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No billing history found.</div>
          ) : (
            bills.map((bill) => (
              <div key={bill._id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 mb-4 md:mb-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="font-bold text-gray-900">{bill.apiId.name || "Unknown API"}</span>
                    {bill.status === "paid" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock size={12} className="mr-1" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Month: {bill.billingMonth} • Total Requests: {bill.totalRequests.toLocaleString()} • Billable: {bill.billableRequests.toLocaleString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    ${(bill.amountDue / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Amount Due
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
