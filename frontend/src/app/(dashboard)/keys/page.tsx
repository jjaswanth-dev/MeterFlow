"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Key, Copy, Check, Trash2, Plus } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface APIKey {
  _id: string;
  key: string;
  apiId: { _id: string; name: string };
  status: "active" | "revoked";
  createdAt: string;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    const fetchKeys = async () => {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      if (!session?.user?.id) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/api/keys?userId=${session.user.id}`);
        setKeys(res.data);
      } catch (error) {
        console.error("Failed to fetch keys", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, [session?.user?.id]);

  const handleGenerateKey = async () => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    setGenerating(true);
    try {
      // Fetch available APIs to link the key to
      const apisRes = await axios.get(`${BACKEND_URL}/api/apis`);
      const apis = apisRes.data;
      
      if (apis.length === 0) {
        alert("No APIs available. Please create an API target first.");
        setGenerating(false);
        return;
      }

      // We just pick the first API for simplicity, or we could add a dropdown
      const selectedApiId = apis[0]._id;

      const res = await axios.post(`${BACKEND_URL}/api/keys`, {
        apiId: selectedApiId,
        userId: session?.user?.id
      });

      // The new key from the backend only has the apiId string, 
      // we need to mock populate it for the UI immediately
      const newKey = {
        ...res.data,
        apiId: { _id: apis[0]._id, name: apis[0].name }
      };

      setKeys([newKey, ...keys]);
    } catch (error) {
      console.error("Failed to generate key", error);
      alert("Failed to generate key. Ensure the backend is running.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    try {
      await axios.delete(`${BACKEND_URL}/api/keys/${id}`);
      setKeys(keys.filter(k => k._id !== id));
    } catch (error) {
      console.error("Failed to delete key", error);
      alert("Failed to delete key");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">API Keys</h2>
          <p className="text-gray-500">Manage your generated API keys for gateway access.</p>
        </div>
        <button 
          onClick={handleGenerateKey}
          disabled={generating}
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? "Generating..." : <><Plus size={18} /> Generate New Key</>}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading keys...</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No API keys found. Generate one to get started.</td></tr>
            ) : keys.map((keyObj) => (
              <tr key={keyObj._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <Key size={16} className="text-gray-400" />
                    <span className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {/* Masking the key slightly for UI presentation */}
                      {keyObj.key.slice(0, 10)}...{keyObj.key.slice(-4)}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(keyObj.key)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedKey === keyObj.key ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {keyObj.apiId?.name || "Unknown API"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    keyObj.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {keyObj.status.charAt(0).toUpperCase() + keyObj.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(keyObj.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleDeleteKey(keyObj._id)}
                    className="text-red-500 hover:text-red-700 transition-colors" 
                    title="Delete Key"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
