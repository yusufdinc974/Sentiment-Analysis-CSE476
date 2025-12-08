import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, TrendingUp, TrendingDown, Clock, Percent, Sparkles, BarChart3, CheckCircle2, Zap, Upload, FileText, PieChart } from 'lucide-react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  // Tab state
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'

  // Single review state
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Batch analysis state
  const [batchFile, setBatchFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchError, setBatchError] = useState(null);

  const analyzeSentiment = async () => {
    if (!reviewText.trim()) {
      setError('Please enter a review to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const requestTimestamp = performance.now();
    const requestPayload = { text: reviewText };
    const requestSize = new Blob([JSON.stringify(requestPayload)]).size;

    try {
      const response = await axios.post('http://localhost:8000/predict', requestPayload);

      const responseTimestamp = performance.now();
      const latency = Math.round(responseTimestamp - requestTimestamp);
      const responseSize = new Blob([JSON.stringify(response.data)]).size;
      const totalDataSize = requestSize + responseSize;

      setResult({
        sentiment: response.data.sentiment,
        confidence: (response.data.confidence * 100).toFixed(2),
        latency: latency,
        dataSize: totalDataSize,
        requestSize: requestSize,
        responseSize: responseSize,
      });
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Failed to connect to the backend. Make sure the server is running on http://localhost:8000'
      );
    } finally {
      setLoading(false);
    }
  };

  const analyzeBatchFile = async () => {
    if (!batchFile) {
      setBatchError('Please select a .txt file to analyze');
      return;
    }

    setBatchLoading(true);
    setBatchError(null);
    setBatchResult(null);

    const formData = new FormData();
    formData.append('file', batchFile);

    try {
      const response = await axios.post('http://localhost:8000/analyze-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setBatchResult(response.data);
    } catch (err) {
      setBatchError(
        err.response?.data?.detail || 
        'Failed to analyze file. Make sure the server is running on http://localhost:8000'
      );
    } finally {
      setBatchLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.txt')) {
      setBatchFile(file);
      setBatchError(null);
    } else {
      setBatchError('Please select a valid .txt file');
      setBatchFile(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      analyzeSentiment();
    }
  };

  // Chart.js data configuration
  const chartData = batchResult ? {
    labels: ['Positive', 'Negative'],
    datasets: [
      {
        data: [batchResult.positive, batchResult.negative],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Emerald/Green
          'rgba(244, 63, 94, 0.8)',  // Rose/Red
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(244, 63, 94)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 13,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = batchResult 
              ? (label === 'Positive' ? batchResult.positive_ratio : batchResult.negative_ratio).toFixed(1)
              : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-4 sm:px-6 lg:px-8 flex items-center">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full mb-4 shadow-sm">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">AI-Powered Analysis</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Sentiment Analysis
            </span>
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            Advanced machine learning classification for movie reviews and user feedback
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-1.5">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Single Review
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'batch'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="h-5 w-5" />
              Batch Analysis
            </button>
          </div>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'single' ? (
            // Single Review Analysis
            <motion.div
              key="single"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                  
                  <div className="mb-6">
                    <label
                      htmlFor="review"
                      className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide"
                    >
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      Review Input
                    </label>
                    <textarea
                      id="review"
                      rows="8"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200 resize-none placeholder-slate-400 font-medium"
                      placeholder="Type or paste your movie review here..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-slate-500 font-medium">
                        {reviewText.length} characters
                      </p>
                      <p className="text-sm text-slate-500 font-medium">
                        <kbd className="px-2 py-1 bg-slate-100 rounded-lg border border-slate-300 font-semibold text-xs">Ctrl+Enter</kbd>
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={analyzeSentiment}
                    disabled={loading || !reviewText.trim()}
                    className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-base text-white transition-all duration-300 ${
                      loading || !reviewText.trim()
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/30'
                    }`}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-5 w-5 border-3 border-white border-t-transparent rounded-full"
                        />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>Analyze Sentiment</span>
                      </>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                      >
                        <p className="text-sm text-red-700 font-semibold">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Result Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[500px]">
                  <AnimatePresence mode="wait">
                    {result ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          className={`px-8 py-8 relative ${
                            result.sentiment === 'POSITIVE'
                              ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600'
                              : 'bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600'
                          }`}
                        >
                          <div className="relative flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-white/25 backdrop-blur-md p-3 rounded-xl shadow-lg">
                                {result.sentiment === 'POSITIVE' ? (
                                  <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} />
                                ) : (
                                  <TrendingDown className="h-8 w-8 text-white" strokeWidth={2.5} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-3xl font-black text-white tracking-tight">
                                    {result.sentiment}
                                  </h3>
                                  <CheckCircle2 className="h-6 w-6 text-white/90" strokeWidth={2.5} />
                                </div>
                                <p className="text-sm text-white/90 font-semibold">Sentiment Detected</p>
                              </div>
                            </div>
                            <div className="text-right bg-white/20 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg">
                              <div className="flex items-center gap-2 justify-end mb-1">
                                <Percent className="h-5 w-5 text-white/90" strokeWidth={2.5} />
                                <span className="text-4xl font-black text-white">
                                  {result.confidence}%
                                </span>
                              </div>
                              <p className="text-sm text-white/90 font-semibold">Confidence</p>
                            </div>
                          </div>
                        </div>

                        <div className="px-8 py-8 bg-slate-50">
                          <h4 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wide">
                            <Clock className="h-5 w-5 text-indigo-600" />
                            Network Performance Metrics
                          </h4>
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="bg-white rounded-xl p-5 border-2 border-indigo-100 shadow-lg hover:shadow-xl transition-shadow"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                  <Clock className="h-4 w-4 text-indigo-600" />
                                </div>
                                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Response Time</p>
                              </div>
                              <p className="text-3xl font-black text-slate-900 mb-2">
                                {result.latency}
                                <span className="text-base font-semibold text-slate-500 ml-1">ms</span>
                              </p>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((result.latency / 500) * 100, 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                />
                              </div>
                            </motion.div>

                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="bg-white rounded-xl p-5 border-2 border-cyan-100 shadow-lg hover:shadow-xl transition-shadow"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-cyan-100 rounded-lg">
                                  <BarChart3 className="h-4 w-4 text-cyan-600" />
                                </div>
                                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Data Size</p>
                              </div>
                              <p className="text-3xl font-black text-slate-900 mb-2">
                                {result.dataSize}
                                <span className="text-base font-semibold text-slate-500 ml-1">bytes</span>
                              </p>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((result.dataSize / 1000) * 100, 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                />
                              </div>
                            </motion.div>
                            
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="bg-white rounded-xl p-5 border-2 border-emerald-100 shadow-lg hover:shadow-xl transition-shadow"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                </div>
                                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Status</p>
                              </div>
                              <p className="text-2xl font-black text-emerald-600 flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
                                Success
                              </p>
                            </motion.div>
                            
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="bg-white rounded-xl p-5 border-2 border-purple-100 shadow-lg hover:shadow-xl transition-shadow"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <Sparkles className="h-4 w-4 text-purple-600" />
                                </div>
                                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Model Type</p>
                              </div>
                              <p className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-600" />
                                ML Classifier
                              </p>
                            </motion.div>
                          </div>

                          <div className="pt-5 border-t-2 border-slate-200">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                                <span className="font-semibold text-slate-700">Request:</span>
                                <span className="font-bold text-slate-900">{result.requestSize} bytes</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <span className="font-semibold text-slate-700">Response:</span>
                                <span className="font-bold text-slate-900">{result.responseSize} bytes</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex items-center justify-center p-12 text-center min-h-[500px]"
                      >
                        <div>
                          <div className="mb-6 inline-flex p-6 bg-slate-100 rounded-2xl">
                            <BarChart3 className="h-16 w-16 text-slate-400" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-3">Ready to Analyze</h3>
                          <p className="text-base text-slate-600">Enter a review to see results</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            // Batch Analysis
            <motion.div
              key="batch"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"></div>
                  
                  <div className="mb-6">
                    <label
                      className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide"
                    >
                      <PieChart className="h-5 w-5 text-teal-600" />
                      File Upload
                    </label>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileChange}
                        disabled={batchLoading}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center gap-4 w-full px-4 py-12 border-3 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                          batchLoading 
                            ? 'bg-slate-100 border-slate-300 cursor-not-allowed' 
                            : 'bg-slate-50 border-slate-300 hover:border-teal-400 hover:bg-teal-50'
                        }`}
                      >
                        <div className="p-4 bg-teal-100 rounded-2xl">
                          <Upload className="h-12 w-12 text-teal-600" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg text-slate-700 mb-1">
                            {batchFile ? batchFile.name : 'Click to upload .txt file'}
                          </p>
                          <p className="text-sm text-slate-500">
                            Upload a text file with multiple reviews (one per line)
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={analyzeBatchFile}
                    disabled={batchLoading || !batchFile}
                    className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-base text-white transition-all duration-300 ${
                      batchLoading || !batchFile
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-700 shadow-lg shadow-teal-500/30'
                    }`}
                  >
                    {batchLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-5 w-5 border-3 border-white border-t-transparent rounded-full"
                        />
                        <span>Analyzing reviews...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        <span>Analyze File</span>
                      </>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {batchError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                      >
                        <p className="text-sm text-red-700 font-semibold">{batchError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Batch Result Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[500px]">
                  <AnimatePresence mode="wait">
                    {batchResult ? (
                      <motion.div
                        key="batch-result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-8 py-8 bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-white/25 backdrop-blur-md p-3 rounded-xl shadow-lg">
                                <PieChart className="h-8 w-8 text-white" strokeWidth={2.5} />
                              </div>
                              <div>
                                <h3 className="text-3xl font-black text-white tracking-tight">Analysis Results</h3>
                                <p className="text-sm text-white/90 font-semibold">{batchResult.total} Total Reviews</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-8 py-10 bg-slate-50">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            {/* Chart */}
                            <div className="flex items-center justify-center">
                              <div className="w-full max-w-[280px]">
                                <Doughnut data={chartData} options={chartOptions} />
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="space-y-5">
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-xl p-6 border-2 border-emerald-100 shadow-lg"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2.5 bg-emerald-100 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                                  </div>
                                  <p className="text-sm text-slate-600 font-bold uppercase tracking-wide">Positive Reviews</p>
                                </div>
                                <p className="text-4xl font-black text-emerald-600 mb-1">
                                  {batchResult.positive}
                                </p>
                                <p className="text-base font-semibold text-slate-500">
                                  {batchResult.positive_ratio.toFixed(1)}% of total
                                </p>
                              </motion.div>

                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-xl p-6 border-2 border-rose-100 shadow-lg"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2.5 bg-rose-100 rounded-lg">
                                    <TrendingDown className="h-6 w-6 text-rose-600" />
                                  </div>
                                  <p className="text-sm text-slate-600 font-bold uppercase tracking-wide">Negative Reviews</p>
                                </div>
                                <p className="text-4xl font-black text-rose-600 mb-1">
                                  {batchResult.negative}
                                </p>
                                <p className="text-base font-semibold text-slate-500">
                                  {batchResult.negative_ratio.toFixed(1)}% of total
                                </p>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="batch-placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex items-center justify-center p-12 text-center min-h-[500px]"
                      >
                        <div>
                          <div className="mb-6 inline-flex p-6 bg-slate-100 rounded-2xl">
                            <PieChart className="h-16 w-16 text-slate-400" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-3">Batch Analysis Ready</h3>
                          <p className="text-base text-slate-600">Upload a file to see aggregated results</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8"
        >
          <div className="inline-flex flex-col items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-lg">
            <p className="text-sm text-slate-800 font-bold">CSE476 - Machine Communication Networks</p>
            <p className="text-xs text-slate-600 font-semibold">Yusuf Dinç & Funda Çelik</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default App;