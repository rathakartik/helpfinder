import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Download, Upload, Mail, Search, Settings, CheckCircle, XCircle, AlertCircle, Zap, Globe, FileText, Users, Activity } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState("single-verify");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobProgress, setJobProgress] = useState(null);
  const [proxies, setProxies] = useState("");
  const [currentProxy, setCurrentProxy] = useState("");
  
  // Single verify form
  const [singleEmail, setSingleEmail] = useState("");
  
  // Single find form
  const [findForm, setFindForm] = useState({
    firstname: "",
    lastname: "",
    domain: ""
  });
  
  // File refs
  const verifyFileRef = useRef(null);
  const findFileRef = useRef(null);

  // Poll job progress
  useEffect(() => {
    let interval;
    if (jobId && jobProgress?.status === "processing") {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/job-progress/${jobId}`);
          setJobProgress(response.data);
          if (response.data.status === "completed" || response.data.status === "error") {
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error fetching progress:", err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [jobId, jobProgress?.status]);

  const handleSingleVerify = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const response = await axios.post(`${API}/verify-single`, {
        email: singleEmail,
        proxy: currentProxy || null
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error verifying email");
    } finally {
      setLoading(false);
    }
  };

  const handleSingleFind = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const response = await axios.post(`${API}/find-single`, {
        ...findForm,
        proxy: currentProxy || null
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error finding email");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkVerify = async () => {
    const file = verifyFileRef.current?.files[0];
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setError("");
    setJobProgress(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API}/verify-bulk`, formData);
      setJobId(response.data.job_id);
      setJobProgress({
        progress: 0,
        current_row: 0,
        total_rows: response.data.total_rows,
        status: "processing",
        log: "Starting..."
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Error starting bulk verification");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkFind = async () => {
    const file = findFileRef.current?.files[0];
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setError("");
    setJobProgress(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API}/find-bulk`, formData);
      setJobId(response.data.job_id);
      setJobProgress({
        progress: 0,
        current_row: 0,
        total_rows: response.data.total_rows,
        status: "processing",
        log: "Starting..."
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Error starting bulk finding");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      const response = await axios.get(`${API}/download-template/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template-${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Error downloading template");
    }
  };

  const downloadResults = async (filterType = "all") => {
    if (!jobId) return;
    
    try {
      const response = await axios.get(`${API}/download-results/${jobId}?filter_type=${filterType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results-${filterType}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Error downloading results");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "valid": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "invalid": return <XCircle className="w-5 h-5 text-red-500" />;
      case "risky": return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "valid": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "invalid": return "text-red-700 bg-red-50 border-red-200";
      case "risky": return "text-amber-700 bg-amber-50 border-amber-200";
      default: return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="backdrop-blur-sm bg-white/80 border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  Email Verifier & Finder
                </h1>
                <p className="text-sm text-slate-500 mt-1">Professional email validation & discovery</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-slate-600">Want Free tool to collect leads?</span>
              <a href="https://marketmindai.com" target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Marketmindai.com/tools
              </a>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Proxy Configuration Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Proxy Configuration</h2>
              <p className="text-sm text-slate-500">Optional proxy setup for enhanced results</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Proxy List <span className="text-slate-400">(one per line)</span>
              </label>
              <textarea
                className="w-full h-32 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none"
                placeholder="http://proxy1:port&#10;http://proxy2:port&#10;socks5://proxy3:port"
                value={proxies}
                onChange={(e) => setProxies(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Current Proxy <span className="text-slate-400">(select from list)</span>
              </label>
              <select
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                value={currentProxy}
                onChange={(e) => setCurrentProxy(e.target.value)}
              >
                <option value="">No Proxy</option>
                {proxies.split('\n').filter(p => p.trim()).map((proxy, idx) => (
                  <option key={idx} value={proxy.trim()}>{proxy.trim()}</option>
                ))}
              </select>
              {currentProxy && (
                <div className="flex items-center space-x-2 text-sm text-emerald-600">
                  <Globe className="w-4 h-4" />
                  <span>Active proxy configured</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Modern Tab Navigation */}
          <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-blue-50/80">
            <nav className="flex space-x-1 p-2">
              {[
                { id: "single-verify", label: "Single Verify", icon: CheckCircle, gradient: "from-emerald-500 to-teal-500" },
                { id: "bulk-verify", label: "Bulk Verify", icon: Users, gradient: "from-blue-500 to-cyan-500" },
                { id: "single-find", label: "Single Find", icon: Search, gradient: "from-purple-500 to-violet-500" },
                { id: "bulk-find", label: "Bulk Find", icon: Activity, gradient: "from-pink-500 to-rose-500" }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setResult(null);
                      setError("");
                      setJobProgress(null);
                    }}
                    className={`${
                      isActive
                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-${tab.gradient.split('-')[1]}-500/25`
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    } relative flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-[1.02]`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-8">
            {/* Single Email Verification */}
            {activeTab === "single-verify" && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Single Email Verification</h3>
                  <p className="text-slate-600">Verify individual email addresses with advanced SMTP validation</p>
                </div>
                
                <div className="max-w-md mx-auto space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className="w-full px-4 py-4 pl-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-lg"
                        placeholder="john.doe@example.com"
                        value={singleEmail}
                        onChange={(e) => setSingleEmail(e.target.value)}
                      />
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSingleVerify}
                    disabled={loading || !singleEmail}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-emerald-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <span>Verify Email</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Email Verification */}
            {activeTab === "bulk-verify" && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Bulk Email Verification</h3>
                    <p className="text-slate-600">Process up to 1000 email addresses from CSV files</p>
                  </div>
                  <button
                    onClick={() => downloadTemplate("verify")}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Template</span>
                  </button>
                </div>
                
                <div className="max-w-md mx-auto space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Upload CSV File <span className="text-slate-400">(max 1000 records)</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={verifyFileRef}
                        type="file"
                        accept=".csv"
                        className="w-full px-4 py-4 border-2 border-dashed border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <p className="text-sm text-slate-500">
                      CSV should contain 'email' column
                    </p>
                  </div>
                  
                  <button
                    onClick={handleBulkVerify}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 px-6 rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                        <span>Starting...</span>
                      </div>
                    ) : (
                      <span>Start Verification</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Single Email Finding */}
            {activeTab === "single-find" && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Single Email Finding</h3>
                  <p className="text-slate-600">Find emails using firstname, lastname, and domain with 7 pattern generation</p>
                </div>
                
                <div className="max-w-md mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">First Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                        placeholder="John"
                        value={findForm.firstname}
                        onChange={(e) => setFindForm({...findForm, firstname: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Last Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                        placeholder="Doe"
                        value={findForm.lastname}
                        onChange={(e) => setFindForm({...findForm, lastname: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Domain</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full px-4 py-3 pl-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                        placeholder="example.com"
                        value={findForm.domain}
                        onChange={(e) => setFindForm({...findForm, domain: e.target.value})}
                      />
                      <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSingleFind}
                    disabled={loading || !findForm.firstname || !findForm.lastname || !findForm.domain}
                    className="w-full bg-gradient-to-r from-purple-500 to-violet-500 text-white py-4 px-6 rounded-xl hover:from-purple-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-purple-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                        <span>Finding...</span>
                      </div>
                    ) : (
                      <span>Find Email</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Email Finding */}
            {activeTab === "bulk-find" && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Bulk Email Finding</h3>
                    <p className="text-slate-600">Find emails for up to 1000 records using pattern generation</p>
                  </div>
                  <button
                    onClick={() => downloadTemplate("find")}
                    className="flex items-center space-x-2 text-pink-600 hover:text-pink-700 font-medium transition-colors bg-pink-50 hover:bg-pink-100 px-4 py-2 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Template</span>
                  </button>
                </div>
                
                <div className="max-w-md mx-auto space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Upload CSV File <span className="text-slate-400">(max 1000 records)</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={findFileRef}
                        type="file"
                        accept=".csv"
                        className="w-full px-4 py-4 border-2 border-dashed border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200 bg-white/80 backdrop-blur-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                      />
                    </div>
                    <p className="text-sm text-slate-500">
                      CSV should contain 'firstname', 'lastname', 'domain' columns
                    </p>
                  </div>
                  
                  <button
                    onClick={handleBulkFind}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 px-6 rounded-xl hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-pink-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                        <span>Starting...</span>
                      </div>
                    ) : (
                      <span>Start Finding</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Single Result Display */}
            {result && !jobProgress && (
              <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>Result</span>
                </h4>
                <div className="space-y-4">
                  {result.email && (
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <p className="font-medium text-slate-900">{result.email}</p>
                          <p className="text-sm text-slate-500">{result.reason}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyle(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                  )}
                  {result.found_email && (
                    <div className="p-4 bg-white rounded-lg border border-slate-200">
                      <p className="font-medium text-slate-900 mb-1">Found Email</p>
                      <p className="text-lg text-slate-700">{result.found_email}</p>
                      <p className="text-sm text-slate-500 mt-1">{result.reason}</p>
                    </div>
                  )}
                  {result.found_email === null && result.reason && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <p className="font-medium text-amber-900">No Valid Email Found</p>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        Unable to find a valid email pattern for {result.firstname} {result.lastname} at {result.domain}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">Reason: {result.reason.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Job Progress Display */}
            {jobProgress && (
              <div className="mt-8 space-y-6">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      <span>Processing Progress</span>
                    </h4>
                    <span className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full">
                      {jobProgress.current_row} / {jobProgress.total_rows}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${jobProgress.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{jobProgress.progress}% complete</span>
                      <span className="text-slate-600">{jobProgress.status}</span>
                    </div>
                  </div>
                  
                  {jobProgress.log && (
                    <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg">
                      <p className="text-sm font-mono text-slate-700">{jobProgress.log}</p>
                    </div>
                  )}

                  {jobProgress.status === "completed" && (
                    <div className="mt-6 space-y-4">
                      <h5 className="font-medium text-slate-900 flex items-center space-x-2">
                        <Download className="w-4 h-4 text-emerald-500" />
                        <span>Download Results</span>
                      </h5>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => downloadResults("all")}
                          className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors font-medium"
                        >
                          All Results
                        </button>
                        {activeTab.includes("verify") && (
                          <>
                            <button
                              onClick={() => downloadResults("valid")}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors font-medium"
                            >
                              Valid Only
                            </button>
                            <button
                              onClick={() => downloadResults("risky")}
                              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 transition-colors font-medium"
                            >
                              Risky Only
                            </button>
                            <button
                              onClick={() => downloadResults("invalid")}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors font-medium"
                            >
                              Invalid Only
                            </button>
                          </>
                        )}
                        {activeTab.includes("find") && (
                          <>
                            <button
                              onClick={() => downloadResults("found")}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors font-medium"
                            >
                              Found Only
                            </button>
                            <button
                              onClick={() => downloadResults("not_found")}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors font-medium"
                            >
                              Not Found Only
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {jobProgress.status === "error" && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-800 text-sm font-medium">Processing failed. Please try again.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
