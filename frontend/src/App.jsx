import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, TrendingUp, TrendingDown, Clock, Percent, Sparkles, BarChart3, CheckCircle2, Zap, Upload, FileText, PieChart, Brain, Cpu, Heart } from 'lucide-react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function App() {
  // Tab state
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'

  // Single review state
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('distilbert'); // 'distilbert', 'tfidf', or 'emotion'

  // Batch analysis state
  const [batchFile, setBatchFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchError, setBatchError] = useState(null);
  const [batchSelectedModel, setBatchSelectedModel] = useState('distilbert'); // Separate model for batch

  const analyzeSentiment = async () => {
    if (!reviewText.trim()) {
      setError('Please enter a review to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const requestTimestamp = performance.now();
    const requestPayload = { 
      text: reviewText,
      model_type: selectedModel 
    };
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
        details: response.data.details || null, // Emotion model includes details
        latency: latency,
        dataSize: totalDataSize,
        requestSize: requestSize,
        responseSize: responseSize,
        modelUsed: selectedModel,
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

    const requestTimestamp = performance.now();

    const formData = new FormData();
    formData.append('file', batchFile);
    formData.append('model_type', batchSelectedModel);

    // Calculate file size
    const fileSize = batchFile.size;

    try {
      const response = await axios.post('http://localhost:8000/analyze-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseTimestamp = performance.now();
      const latency = Math.round(responseTimestamp - requestTimestamp);

      // Calculate response size
      const responseSize = new Blob([JSON.stringify(response.data)]).size;
      const totalDataSize = fileSize + responseSize;

      setBatchResult({
        modelMode: response.data.model_mode,
        total: response.data.total,
        stats: response.data.stats,
        latency: latency,
        dataSize: totalDataSize,
        fileSize: fileSize,
        responseSize: responseSize,
        modelUsed: batchSelectedModel,
      });
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

  // Emotion color palette
  const emotionColorPalette = [
    'rgba(251, 191, 36, 0.8)',   // Amber - JOY
    'rgba(59, 130, 246, 0.8)',   // Blue - SADNESS
    'rgba(239, 68, 68, 0.8)',    // Red - ANGER
    'rgba(168, 85, 247, 0.8)',   // Purple - FEAR
    'rgba(236, 72, 153, 0.8)',   // Pink - SURPRISE
    'rgba(34, 197, 94, 0.8)',    // Green - DISGUST
    'rgba(244, 63, 94, 0.8)',    // Rose - LOVE
    'rgba(99, 102, 241, 0.8)',   // Indigo - ADMIRATION
    'rgba(249, 115, 22, 0.8)',   // Orange - EXCITEMENT
    'rgba(20, 184, 166, 0.8)',   // Teal - GRATITUDE
    'rgba(217, 70, 239, 0.8)',   // Fuchsia
    'rgba(14, 165, 233, 0.8)',   // Sky
    'rgba(132, 204, 22, 0.8)',   // Lime
    'rgba(251, 146, 60, 0.8)',   // Orange-400
    'rgba(139, 92, 246, 0.8)',   // Violet
    'rgba(124, 58, 237, 0.8)',   // Violet-600
    'rgba(165, 180, 252, 0.8)',  // Indigo-300
    'rgba(252, 165, 165, 0.8)',  // Red-300
  ];

  // Chart.js configurations
  const binaryChartData = batchResult && batchResult.modelMode === 'binary' ? {
    labels: ['Positive', 'Negative'],
    datasets: [
      {
        data: [batchResult.stats.positive, batchResult.stats.negative],
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

  const emotionChartData = batchResult && batchResult.modelMode === 'emotion' ? {
    labels: batchResult.stats.map(item => item.label),
    datasets: [
      {
        label: 'Count',
        data: batchResult.stats.map(item => item.count),
        backgroundColor: batchResult.stats.map((_, index) => emotionColorPalette[index % emotionColorPalette.length]),
        borderColor: batchResult.stats.map((_, index) => emotionColorPalette[index % emotionColorPalette.length].replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  } : null;

  const binaryChartOptions = {
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
            const percentage = batchResult && batchResult.modelMode === 'binary'
              ? (label === 'Positive' ? batchResult.stats.positive_ratio : batchResult.stats.negative_ratio).toFixed(1)
              : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  const emotionChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.x || 0;
            const percentage = batchResult && batchResult.modelMode === 'emotion'
              ? batchResult.stats[context.dataIndex]?.percentage.toFixed(1)
              : 0;
            return `Count: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
      y: {
        ticks: {
          font: {
            weight: 'bold',
            size: 11,
          },
        },
      },
    },
  };

  // All model options
  const allModelOptions = [
    {
      value: 'distilbert',
      label: 'DistilBERT',
      description: 'High Accuracy, Higher Latency',
      icon: Brain,
      color: 'indigo'
    },
    {
      value: 'tfidf',
      label: 'TF-IDF',
      description: 'Lower Accuracy, Low Latency',
      icon: Cpu,
      color: 'purple'
    },
    {
      value: 'emotion',
      label: 'BERT Emotion',
      description: '28 Emotion Labels',
      icon: Heart,
      color: 'pink'
    }
  ];

  const selectedModelOption = allModelOptions.find(m => m.value === selectedModel);
  const batchSelectedModelOption = allModelOptions.find(m => m.value === batchSelectedModel);

  // Helper function to get emotion color
  const getEmotionColor = (sentiment) => {
    const emotionColors = {
      'JOY': 'from-yellow-500 via-amber-500 to-yellow-600',
      'SADNESS': 'from-blue-500 via-indigo-500 to-blue-600',
      'ANGER': 'from-red-500 via-rose-500 to-red-600',
      'FEAR': 'from-purple-500 via-violet-500 to-purple-600',
      'SURPRISE': 'from-pink-500 via-fuchsia-500 to-pink-600',
      'DISGUST': 'from-green-500 via-emerald-500 to-green-600',
      'LOVE': 'from-rose-500 via-pink-500 to-rose-600',
      'ADMIRATION': 'from-indigo-500 via-purple-500 to-indigo-600',
      'EXCITEMENT': 'from-orange-500 via-amber-500 to-orange-600',
      'GRATITUDE': 'from-teal-500 via-cyan-500 to-teal-600',
    };
    return emotionColors[sentiment?.toUpperCase()] || 'from-indigo-500 via-purple-500 to-indigo-600';
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
            // ==================== SINGLE REVIEW ANALYSIS ====================
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
                  
                  {/* Model Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Brain className="h-5 w-5 text-indigo-600" />
                      Select AI Model
                    </label>
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200 font-semibold appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {allModelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Model Info Card */}
                    <div className={`mt-3 p-4 rounded-xl border-2 ${
                      selectedModel === 'distilbert' 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : selectedModel === 'tfidf'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-pink-50 border-pink-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {selectedModel === 'distilbert' ? (
                          <Brain className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        ) : selectedModel === 'tfidf' ? (
                          <Cpu className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Heart className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm font-bold ${
                            selectedModel === 'distilbert' 
                              ? 'text-indigo-900' 
                              : selectedModel === 'tfidf'
                              ? 'text-purple-900'
                              : 'text-pink-900'
                          }`}>
                            {selectedModelOption?.label}
                          </p>
                          <p className={`text-xs mt-1 ${
                            selectedModel === 'distilbert' 
                              ? 'text-indigo-700' 
                              : selectedModel === 'tfidf'
                              ? 'text-purple-700'
                              : 'text-pink-700'
                          }`}>
                            {selectedModel === 'distilbert' 
                              ? 'Advanced transformer-based model for superior accuracy'
                              : selectedModel === 'tfidf'
                              ? 'Fast traditional ML model optimized for speed'
                              : 'Detects 28 different emotions with detailed confidence scores'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Input */}
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
                      rows="6"
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
                            result.modelUsed === 'emotion'
                              ? `bg-gradient-to-br ${getEmotionColor(result.sentiment)}`
                              : result.sentiment === 'POSITIVE'
                              ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600'
                              : 'bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600'
                          }`}
                        >
                          <div className="relative flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-white/25 backdrop-blur-md p-3 rounded-xl shadow-lg">
                                {result.modelUsed === 'emotion' ? (
                                  <Heart className="h-8 w-8 text-white" strokeWidth={2.5} />
                                ) : result.sentiment === 'POSITIVE' ? (
                                  <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} />
                                ) : (
                                  <TrendingDown className="h-8 w-8 text-white" strokeWidth={2.5} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-3xl font-black text-white tracking-tight uppercase">
                                    {result.sentiment}
                                  </h3>
                                  <CheckCircle2 className="h-6 w-6 text-white/90" strokeWidth={2.5} />
                                </div>
                                <p className="text-sm text-white/90 font-semibold">
                                  {result.modelUsed === 'emotion' ? 'Emotion Detected' : 'Sentiment Detected'}
                                </p>
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

                        {/* Emotion Details - Show only for emotion model */}
                        {result.modelUsed === 'emotion' && result.details && (
                          <div className="px-8 py-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-b-2 border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                              <Heart className="h-5 w-5 text-pink-600" />
                              Top 3 Emotions Detected
                            </h4>
                            <div className="space-y-3">
                              {result.details.slice(0, 3).map((emotion, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="bg-white rounded-xl p-4 shadow-md"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-slate-800 uppercase">
                                      {emotion.label}
                                    </span>
                                    <span className="text-sm font-black text-indigo-600">
                                      {(emotion.score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${emotion.score * 100}%` }}
                                      transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                    />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

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
                              className={`bg-white rounded-xl p-5 border-2 shadow-lg hover:shadow-xl transition-shadow ${
                                result.modelUsed === 'distilbert' 
                                  ? 'border-indigo-100' 
                                  : result.modelUsed === 'tfidf'
                                  ? 'border-purple-100'
                                  : 'border-pink-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`p-2 rounded-lg ${
                                  result.modelUsed === 'distilbert' 
                                    ? 'bg-indigo-100' 
                                    : result.modelUsed === 'tfidf'
                                    ? 'bg-purple-100'
                                    : 'bg-pink-100'
                                }`}>
                                  {result.modelUsed === 'distilbert' ? (
                                    <Brain className="h-4 w-4 text-indigo-600" />
                                  ) : result.modelUsed === 'tfidf' ? (
                                    <Cpu className="h-4 w-4 text-purple-600" />
                                  ) : (
                                    <Heart className="h-4 w-4 text-pink-600" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Model Used</p>
                              </div>
                              <p className="text-lg font-black text-slate-900 flex items-center gap-2">
                                {result.modelUsed === 'distilbert' ? (
                                  <>
                                    <Brain className="h-5 w-5 text-indigo-600" />
                                    DistilBERT
                                  </>
                                ) : result.modelUsed === 'tfidf' ? (
                                  <>
                                    <Cpu className="h-5 w-5 text-purple-600" />
                                    TF-IDF
                                  </>
                                ) : (
                                  <>
                                    <Heart className="h-5 w-5 text-pink-600" />
                                    Emotion
                                  </>
                                )}
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
            // ==================== BATCH ANALYSIS ====================
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
                  
                  {/* Model Selection for Batch */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Brain className="h-5 w-5 text-teal-600" />
                      Select AI Model
                    </label>
                    <div className="relative">
                      <select
                        value={batchSelectedModel}
                        onChange={(e) => setBatchSelectedModel(e.target.value)}
                        disabled={batchLoading}
                        className="w-full px-4 py-3 text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition-all duration-200 font-semibold appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {allModelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Model Info Card for Batch */}
                    <div className={`mt-3 p-4 rounded-xl border-2 ${
                      batchSelectedModel === 'distilbert' 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : batchSelectedModel === 'tfidf'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-pink-50 border-pink-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {batchSelectedModel === 'distilbert' ? (
                          <Brain className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        ) : batchSelectedModel === 'tfidf' ? (
                          <Cpu className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Heart className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm font-bold ${
                            batchSelectedModel === 'distilbert' 
                              ? 'text-indigo-900' 
                              : batchSelectedModel === 'tfidf'
                              ? 'text-purple-900'
                              : 'text-pink-900'
                          }`}>
                            {batchSelectedModelOption?.label}
                          </p>
                          <p className={`text-xs mt-1 ${
                            batchSelectedModel === 'distilbert' 
                              ? 'text-indigo-700' 
                              : batchSelectedModel === 'tfidf'
                              ? 'text-purple-700'
                              : 'text-pink-700'
                          }`}>
                            {batchSelectedModel === 'distilbert' 
                              ? 'Advanced transformer-based model for superior accuracy'
                              : batchSelectedModel === 'tfidf'
                              ? 'Fast traditional ML model optimized for speed'
                              : 'Analyzes 28 different emotions across all reviews'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
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
                        className={`flex flex-col items-center justify-center gap-4 w-full px-4 py-10 border-3 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                          batchLoading 
                            ? 'bg-slate-100 border-slate-300 cursor-not-allowed' 
                            : 'bg-slate-50 border-slate-300 hover:border-teal-400 hover:bg-teal-50'
                        }`}
                      >
                        <div className="p-4 bg-teal-100 rounded-2xl">
                          <Upload className="h-10 w-10 text-teal-600" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-base text-slate-700 mb-1">
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

                        <div className="px-8 py-8 bg-slate-50">
                          {/* Conditional Chart Rendering */}
                          {batchResult.modelMode === 'binary' ? (
                            // Binary Mode - Pie Chart
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                              {/* Chart */}
                              <div className="flex items-center justify-center">
                                <div className="w-full max-w-[240px]">
                                  <Doughnut data={binaryChartData} options={binaryChartOptions} />
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="space-y-4">
                                <motion.div 
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                  className="bg-white rounded-xl p-5 border-2 border-emerald-100 shadow-lg"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Positive</p>
                                  </div>
                                  <p className="text-3xl font-black text-emerald-600 mb-1">
                                    {batchResult.stats.positive}
                                  </p>
                                  <p className="text-sm font-semibold text-slate-500">
                                    {batchResult.stats.positive_ratio.toFixed(1)}% of total
                                  </p>
                                </motion.div>

                                <motion.div 
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                  className="bg-white rounded-xl p-5 border-2 border-rose-100 shadow-lg"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-rose-100 rounded-lg">
                                      <TrendingDown className="h-5 w-5 text-rose-600" />
                                    </div>
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Negative</p>
                                  </div>
                                  <p className="text-3xl font-black text-rose-600 mb-1">
                                    {batchResult.stats.negative}
                                  </p>
                                  <p className="text-sm font-semibold text-slate-500">
                                    {batchResult.stats.negative_ratio.toFixed(1)}% of total
                                  </p>
                                </motion.div>
                              </div>
                            </div>
                          ) : (
                            // Emotion Mode - Bar Chart
                            <div className="mb-6">
                              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Heart className="h-5 w-5 text-pink-600" />
                                Emotion Distribution
                              </h4>
                              <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-lg" style={{ height: '400px' }}>
                                <Bar data={emotionChartData} options={emotionChartOptions} />
                              </div>
                              
                              {/* Top 3 Emotions Summary */}
                              <div className="mt-6 grid grid-cols-3 gap-3">
                                {batchResult.stats.slice(0, 3).map((emotion, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className="bg-white rounded-xl p-4 border-2 border-indigo-100 shadow-lg text-center"
                                  >
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-wide mb-2">
                                      #{index + 1} {emotion.label}
                                    </p>
                                    <p className="text-2xl font-black text-indigo-600">
                                      {emotion.count}
                                    </p>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                      {emotion.percentage.toFixed(1)}%
                                    </p>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Network Metrics */}
                          <div className="pt-6 border-t-2 border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                              <Clock className="h-5 w-5 text-teal-600" />
                              Network Performance Metrics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white rounded-xl p-4 border-2 border-teal-100 shadow-lg"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-teal-100 rounded-lg">
                                    <Clock className="h-4 w-4 text-teal-600" />
                                  </div>
                                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Response Time</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900">
                                  {batchResult.latency}
                                  <span className="text-sm font-semibold text-slate-500 ml-1">ms</span>
                                </p>
                              </motion.div>

                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white rounded-xl p-4 border-2 border-cyan-100 shadow-lg"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-cyan-100 rounded-lg">
                                    <BarChart3 className="h-4 w-4 text-cyan-600" />
                                  </div>
                                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Data Size</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900">
                                  {batchResult.dataSize}
                                  <span className="text-sm font-semibold text-slate-500 ml-1">bytes</span>
                                </p>
                              </motion.div>

                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-white rounded-xl p-4 border-2 border-emerald-100 shadow-lg"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Status</p>
                                </div>
                                <p className="text-xl font-black text-emerald-600 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                                  Success
                                </p>
                              </motion.div>

                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className={`bg-white rounded-xl p-4 border-2 shadow-lg ${
                                  batchResult.modelUsed === 'distilbert' 
                                    ? 'border-indigo-100' 
                                    : batchResult.modelUsed === 'tfidf'
                                    ? 'border-purple-100'
                                    : 'border-pink-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    batchResult.modelUsed === 'distilbert' 
                                      ? 'bg-indigo-100' 
                                      : batchResult.modelUsed === 'tfidf'
                                      ? 'bg-purple-100'
                                      : 'bg-pink-100'
                                  }`}>
                                    {batchResult.modelUsed === 'distilbert' ? (
                                      <Brain className="h-4 w-4 text-indigo-600" />
                                    ) : batchResult.modelUsed === 'tfidf' ? (
                                      <Cpu className="h-4 w-4 text-purple-600" />
                                    ) : (
                                      <Heart className="h-4 w-4 text-pink-600" />
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Model Used</p>
                                </div>
                                <p className="text-base font-black text-slate-900 flex items-center gap-1.5">
                                  {batchResult.modelUsed === 'distilbert' ? (
                                    <>
                                      <Brain className="h-4 w-4 text-indigo-600" />
                                      DistilBERT
                                    </>
                                  ) : batchResult.modelUsed === 'tfidf' ? (
                                    <>
                                      <Cpu className="h-4 w-4 text-purple-600" />
                                      TF-IDF
                                    </>
                                  ) : (
                                    <>
                                      <Heart className="h-4 w-4 text-pink-600" />
                                      Emotion
                                    </>
                                  )}
                                </p>
                              </motion.div>
                            </div>

                            {/* Data Transfer Breakdown */}
                            <div className="mt-4 pt-4 border-t-2 border-slate-200">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 bg-teal-500 rounded-full"></div>
                                  <span className="font-semibold text-slate-700">File:</span>
                                  <span className="font-bold text-slate-900">{batchResult.fileSize} bytes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
                                  <span className="font-semibold text-slate-700">Response:</span>
                                  <span className="font-bold text-slate-900">{batchResult.responseSize} bytes</span>
                                </div>
                              </div>
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
            <p className="text-sm text-slate-800 font-bold">CSE476 - Mobile Communication Networks</p>
            <p className="text-xs text-slate-600 font-semibold">Yusuf Dinç & Funda Çelik</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default App;