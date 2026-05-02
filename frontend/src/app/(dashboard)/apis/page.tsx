"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Server, Activity, ArrowRight, Plus, Trash2 } from "lucide-react"; // Using lucide-react for nice icons
import { useSession } from "@/lib/auth-client";

interface API {
  _id: string;
  name: string;
  baseUrl: string;
  description: string;
  category: string;
  pricing: { freeQuota: number; pricePer100Requests: number };
}

export default function APIsPage() {
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newApi, setNewApi] = useState({
    name: "",
    baseUrl: "",
    description: "",
    category: "",
    pricing: { freeQuota: 100, pricePer100Requests: 10 }
  });

  const fetchApis = async () => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    try {
      const res = await axios.get(`${BACKEND_URL}/api/apis`);
      setApis(res.data);
    } catch (error) {
      console.error("Failed to fetch APIs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleAddApi = async (e: React.FormEvent) => {
    e.preventDefault();
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    try {
      await axios.post(`${BACKEND_URL}/api/apis`, {
        ...newApi,
        ownerId: session?.user?.id
      });
      setIsModalOpen(false);
      fetchApis();
    } catch (error) {
      console.error("Failed to add API", error);
      alert("Failed to add API");
    }
  };

  const handleDeleteApi = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API? This will also delete all associated keys.")) return;
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    try {
      await axios.delete(`${BACKEND_URL}/api/apis/${id}`);
      fetchApis();
    } catch (error) {
      console.error("Failed to delete API", error);
      alert("Failed to delete API");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Registered APIs</h2>
          <p className="text-gray-500">Manage your connected APIs and their configurations.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          <Plus size={18} />
          <span>Add New API</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500">Loading APIs...</p>
        ) : (
          apis.map((api) => (
            <div key={api._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Server size={20} />
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{api.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{api.description}</p>
                
                <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono text-gray-600 mb-4 truncate border border-gray-100">
                  {api.baseUrl}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Activity size={16} className="text-gray-400" />
                    <span>Quota: {api.pricing.freeQuota} req/mo</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                <button onClick={() => handleDeleteApi(api._id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center space-x-1 transition-colors">
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
                <button className="text-blue-600 text-sm font-medium flex items-center space-x-1 hover:text-blue-700 transition-colors group">
                  <span>Manage</span>
                  <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New API</h3>
            <form onSubmit={handleAddApi} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Name</label>
                <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" value={newApi.name} onChange={(e) => setNewApi({...newApi, name: e.target.value})} placeholder="e.g. My AI Service" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input required type="url" className="w-full border border-gray-300 rounded-md px-3 py-2" value={newApi.baseUrl} onChange={(e) => setNewApi({...newApi, baseUrl: e.target.value})} placeholder="https://api.example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full border border-gray-300 rounded-md px-3 py-2" value={newApi.description} onChange={(e) => setNewApi({...newApi, description: e.target.value})} placeholder="What does this API do?"></textarea>
              </div>
              <div className="flex space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save API</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
