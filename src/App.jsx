import React, { useState, useEffect, useRef } from 'react';

// --- MATH FUNCTIONS ---
const standardNormalCDF = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
};

const getZTableValue = (z) => {
  const area = standardNormalCDF(z) - 0.5;
  const rounded = Math.max(0, area).toFixed(4);
  return Number(rounded).toString(); 
};

// --- TERMINAL TYPEWRITER COMPONENT ---
const Typewriter = ({ text, delay = 20, start = true, onComplete }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const hasCompleted = useRef(false);

  useEffect(() => {
    setCurrentText('');
    setCurrentIndex(0);
    setIsTyping(true);
    hasCompleted.current = false;
  }, [text, start]);

  useEffect(() => {
    if (!start) return;
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
      if (onComplete && !hasCompleted.current) {
        hasCompleted.current = true;
        onComplete();
      }
    }
  }, [currentIndex, delay, text, start, onComplete]);

  if (!start) return null;

  return (
    <span>
      {currentText}
      {isTyping && <span className="animate-pulse text-[#0f9d58] ml-1 opacity-75">|</span>}
    </span>
  );
};
// function
function App() {
  const [mean, setMean] = useState(0); 
  const [stdDev, setStdDev] = useState(1);
  const [lowerBound, setLowerBound] = useState('');
  const [upperBound, setUpperBound] = useState('');
  const [calculation, setCalculation] = useState(null);
  
  const [sequence, setSequence] = useState(0);
  const [highlightZ, setHighlightZ] = useState({ row: null, col: null });

  const desmosContainerRef = useRef(null);
  const calculatorRef = useRef(null);
  const shadingAnimationRef = useRef(null);
  const tableRef = useRef(null);
  const resultsRef = useRef(null);

  const zRows = Array.from({ length: 36 }, (_, i) => (i * 0.1).toFixed(1)); 
  const zCols = [0.00, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09];

   useEffect(() => {
    if (!calculatorRef.current && window.Desmos && desmosContainerRef.current) {
      calculatorRef.current = window.Desmos.GraphingCalculator(desmosContainerRef.current, {
        expressions: false, settingsMenu: false, zoomButtons: true, invertedColors: false, lockViewport: false
      });
      calculatorRef.current.setExpression({ id: 'bell-curve', latex: 'f(x) = \\frac{1}{s\\sqrt{2\\pi}}e^{-0.5\\left(\\frac{x-m}{s}\\right)^{2}}', color: '#0f9d58' });
      calculatorRef.current.setExpression({ id: 'shading', latex: '', color: '#0f9d58', fillOpacity: 0.3, lines: false });
      calculatorRef.current.setMathBounds({ left: -5, right: 5, bottom: -0.05, top: 0.5 });
    }
    if (calculatorRef.current) {
      calculatorRef.current.setExpression({ id: 'mean', latex: `m=${mean}` });
      calculatorRef.current.setExpression({ id: 'stdDev', latex: `s=${stdDev}` });
    }
  }, [mean, stdDev]);


  const handleCalculate = () => {
    if (lowerBound === '' && upperBound === '') return;

    setSequence(0);
    setHighlightZ({ row: null, col: null });
    if (shadingAnimationRef.current) cancelAnimationFrame(shadingAnimationRef.current);

    const lVal = lowerBound === '' ? null : parseFloat(lowerBound);
    const uVal = upperBound === '' ? null : parseFloat(upperBound);
    
    let z1 = lVal !== null ? (lVal - mean) / stdDev : null;
    let z2 = uVal !== null ? (uVal - mean) / stdDev : null;
    let prob = 0, calcType = '';

    if (lVal !== null && uVal !== null) {
      calcType = 'between'; prob = standardNormalCDF(z2) - standardNormalCDF(z1);
    } else if (lVal !== null) {
      calcType = 'greater'; prob = 1 - standardNormalCDF(z1);
    } else if (uVal !== null) {
      calcType = 'less'; prob = standardNormalCDF(z2);
    }

    setCalculation({
      type: calcType, x1: lVal, x2: uVal,
      z1: z1 !== null ? z1.toFixed(4) : null,
      z2: z2 !== null ? z2.toFixed(4) : null,
      prob: (Math.max(0, prob) * 100).toFixed(2),
      rawFormula1: z1 !== null ? `Z₁ = (${lVal} - ${mean}) / ${stdDev}` : '',
      rawFormula2: z2 !== null ? `Z₂ = (${uVal} - ${mean}) / ${stdDev}` : ''
    });

    const animStart = lVal !== null ? lVal : (mean - 4 * stdDev);
    const animEnd = uVal !== null ? uVal : (mean + 4 * stdDev);
    const startTime = performance.now();
    const duration = 1500;

    const animateShading = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentUpper = animStart + (animEnd - animStart) * easeOut;

      if (calculatorRef.current) {
        calculatorRef.current.setExpression({
          id: 'shading', latex: `0 \\le y \\le f(x) \\left\\{ ${lVal ?? -9999} \\le x \\le ${currentUpper} \\right\\}`, color: '#0f9d58'
        });
      }
      if (progress < 1) {
        shadingAnimationRef.current = requestAnimationFrame(animateShading);
      } else {
        if (calculatorRef.current) {
          calculatorRef.current.setExpression({
            id: 'shading', latex: `0 \\le y \\le f(x) \\left\\{ ${lVal ?? -9999} \\le x \\le ${uVal ?? 9999} \\right\\}`, color: '#0f9d58'
          });
        }
      }
    };
    shadingAnimationRef.current = requestAnimationFrame(animateShading);
    setSequence(1);
  };

  const triggerTableHighlight = () => {
    if (tableRef.current) tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    const targetZ = calculation.type === 'less' ? calculation.z2 : (calculation.z2 || calculation.z1);
    const zStr = Math.abs(targetZ).toFixed(2); 
    
    const targetRow = zStr.slice(0, 3); 
    const targetCol = "0.0" + zStr.slice(3, 4); 

    setHighlightZ({ row: targetRow, col: targetCol });
    
    setTimeout(() => {
      setSequence(6);
      if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 3000);
  };

  const loadLectureExample = () => {
    setMean(68); setStdDev(2.5); setLowerBound('66'); setUpperBound('71');
    setTimeout(() => {
      if (calculatorRef.current) {
        const peakHeight = 1 / (2.5 * Math.sqrt(2 * Math.PI));
        calculatorRef.current.setMathBounds({ left: 68 - 10, right: 68 + 10, bottom: - (peakHeight * 0.1), top: peakHeight * 1.2 });
      }
      handleCalculate(); 
    }, 50);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans selection:bg-green-200">
      
      {/* CLEAN HEADER NO NAVBAR */}
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col gap-8">
        
        {/* ARTICLE HEADER */}
        <div className="border-b border-gray-300 pb-6 mb-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">Normal Distribution</h1>
          <p className="text-gray-500 text-lg md:text-xl font-medium">A Comprehensive Guide & Interactive Visualizer</p>
        </div>

        {/* --- FULL ARTICLE CONTENT RESTORED --- */}
        <article className="prose max-w-none text-gray-700 space-y-6 text-[17px] leading-[1.6]">
          
          <p>
            <strong>Normal distributions</strong>, also known as Gaussian distributions, are a fundamental concept in Statistics and Probability Theory. They depict the distribution of a continuous random variable in which a symmetric, bell-shaped curve forms as the data tends to cluster around the mean.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What is Normal Distribution?</h2>
          <p>
            A normal distribution is a continuous probability distribution where most data points cluster toward the middle of the range, while the rest taper off symmetrically toward either extreme. The shape of this curve is entirely determined by two parameters:
          </p>
          <ul className="list-disc pl-8 space-y-1 mb-4">
            <li><strong>Mean (μ):</strong> Represents the center of the distribution.</li>
            <li><strong>Standard Deviation (σ):</strong> Represents the spread or width of the curve.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Normal Distribution Formula</h2>
          <p>
            For a continuous random variable X, the probability density function (PDF) is given by the formula:
          </p>
          
          <div className="my-8 flex justify-center md:justify-start">
            <img src="/formula.png" alt="Normal Distribution Formula" className="max-w-full md:max-w-lg shadow-sm border border-gray-100 rounded" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Standard Normal Distribution</h2>
          <p>
            A normal distribution is called a <strong>Standard Normal Distribution</strong> when its mean is 0 (μ = 0) and its standard deviation is 1 (σ = 1). We can convert any normal distribution into a standard one using the Z-score formula:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg my-4 font-bold text-lg border border-gray-200 text-gray-800 inline-block px-8">
            Z = (X - μ) / σ
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Properties of Normal Distribution</h2>
          <ul className="list-disc pl-8 space-y-2 mb-4">
            <li><strong>Symmetric distribution:</strong> The curve is perfectly balanced toward its mean point, with half the data on either side.</li>
            <li><strong>Bell-Shaped curve:</strong> The graph takes the form of a bell, accumulating most points at its mean position.</li>
            <li><strong>Central Tendency:</strong> The Mean, Median, and Mode are all equal and situated in the exact middle of the curve.</li>
            <li><strong>Asymptotic:</strong> The tails of the curve taper off gradually and stretch to infinity without ever touching the x-axis.</li>
            <li><strong>Total Area:</strong> The total area under the probability density curve is exactly equal to 1.</li>
          </ul>

          <div className="my-8 flex justify-center md:justify-start">
            <img src="/curve1.png" alt="Properties Bell Curve" className="max-w-full md:max-w-xl shadow-sm border border-gray-100 rounded" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Empirical Rule (68-95-99.7 Rule)</h2>
          <p>
            The empirical rule is a basic idea in statistics that offers a quick method of comprehending data distribution. It states that:
          </p>
          <ul className="list-disc pl-8 space-y-1 mb-4">
            <li>Approximately <strong>68%</strong> of the data falls within one standard deviation of the mean (μ ± 1σ).</li>
            <li>Approximately <strong>95%</strong> of the data falls within two standard deviations of the mean (μ ± 2σ).</li>
            <li>Approximately <strong>99.7%</strong> of the data falls within three standard deviations of the mean (μ ± 3σ).</li>
          </ul>

          <div className="my-8 flex justify-center md:justify-start">
            <img src="/curve2.png" alt="Empirical Rule Curve" className="max-w-full md:max-w-xl shadow-sm border border-gray-100 rounded" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Normal Distribution Table (Z-Table)</h2>
          <p className="mb-6">
            The table below provides the area under the standard normal curve from the mean (Z=0) up to a specific Z-score.
          </p>
          
          <div className="bg-white overflow-x-auto mb-10 border border-gray-200 shadow-sm p-4 rounded flex justify-center md:justify-start">
            <img src="/ztable.png" alt="Static Z Table" className="max-w-full rounded" />
          </div>

        </article>

        {/* --- SECTION SEPARATOR --- */}
        <div className="flex items-center my-8">
          <div className="flex-grow border-t-2 border-gray-200 border-dashed"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 font-bold uppercase tracking-widest text-sm bg-gray-50 px-4 py-1 rounded-full border border-gray-200">
            Interactive Sandbox
          </span>
          <div className="flex-grow border-t-2 border-gray-200 border-dashed"></div>
        </div>

        {/* --- MAIN INTERACTIVE COMPONENT --- */}
        <div className="bg-gradient-to-br from-green-50 via-white to-green-50 p-6 md:p-10 rounded-3xl shadow-[0_10px_40px_rgba(15,157,88,0.15)] border-2 border-green-300 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 bg-[#0f9d58] text-white text-xs font-black px-6 py-2 rounded-bl-3xl shadow-md uppercase tracking-widest flex items-center gap-2">
            <span>✨</span> Core Feature
          </div>

          <div className="mb-10 border-b border-green-200 pb-4 pt-4">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Interactive Visualizer & Solver</h2>
            <p className="text-gray-600">Adjust the parameters to visually understand how the bell curve shifts, and use the Area Calculator to watch the step-by-step mathematical breakdown in real-time.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 relative z-10">
            
            {/* Left: Graph Controls */}
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Graph Explorer
              </h3>
              <div ref={desmosContainerRef} style={{ width: '100%', height: '350px' }} className="border border-gray-300 shadow-inner mb-6 bg-white rounded-xl overflow-hidden"></div>
              
              <div className="space-y-6 bg-white p-5 border border-green-100 rounded-xl shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">Mean (μ)</label>
                    <input type="number" value={mean} onChange={(e) => setMean(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 text-center text-[#0f9d58] font-mono bg-green-50 px-2 py-1 rounded border border-green-200 focus:outline-none shadow-sm" />
                  </div>
                  <input type="range" min="-20" max="100" step="0.5" value={mean} onChange={(e) => setMean(Number(e.target.value))} className="w-full accent-[#0f9d58]" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">Standard Deviation (σ)</label>
                    <input type="number" min="0.1" step="0.1" value={stdDev} onChange={(e) => setStdDev(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 text-center text-[#0f9d58] font-mono bg-green-50 px-2 py-1 rounded border border-green-200 focus:outline-none shadow-sm" />
                  </div>
                  <input type="range" min="0.1" max="10" step="0.1" value={stdDev} onChange={(e) => setStdDev(Number(e.target.value))} className="w-full accent-[#0f9d58]" />
                </div>
              </div>
            </div>

            {/* Right: Area Calculator */}
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Area Calculator
              </h3>
              
              <div className="bg-white p-6 border border-green-100 rounded-xl shadow-sm flex-grow flex flex-col">
                <p className="text-sm text-gray-500 mb-4 font-medium">Enter bounds to calculate area probability. Leave a bound empty for infinity.</p>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input type="number" value={lowerBound} onChange={(e) => setLowerBound(e.target.value)} placeholder="Lower Bound" className="bg-gray-50 p-4 w-full border border-gray-300 rounded-xl text-gray-800 font-mono shadow-inner focus:outline-none focus:border-[#0f9d58]" />
                    <div className="flex items-center justify-center font-bold text-gray-400">to</div>
                    <input type="number" value={upperBound} onChange={(e) => setUpperBound(e.target.value)} placeholder="Upper Bound" className="bg-gray-50 p-4 w-full border border-gray-300 rounded-xl text-gray-800 font-mono shadow-inner focus:outline-none focus:border-[#0f9d58]" />
                </div>
                <button onClick={handleCalculate} className="bg-gradient-to-r from-[#0f9d58] to-green-600 text-white px-6 py-4 font-black hover:from-green-600 hover:to-green-700 transition-all rounded-xl shadow-md w-full mb-6 text-lg tracking-wide uppercase">
                  ▶ Calculate & Analyze
                </button>

                <div ref={resultsRef} className="scroll-mt-10 flex-grow">
                  {calculation && sequence >= 1 ? (
                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl overflow-hidden h-full">
                      <h4 className="text-gray-800 text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-300 pb-2">Step-by-Step Analysis</h4>
                      
                      <div className="space-y-6 text-gray-700 min-h-[300px]">
                        {/* STEP 1: Intro Text */}
                        <div className="bg-white p-4 border-l-4 border-indigo-400 rounded shadow-sm">
                          <p className="text-sm font-semibold text-indigo-800 mb-2">Step 1: Standardization</p>
                          <p className="text-xs text-gray-600 mb-3 leading-relaxed min-h-[40px]">
                            <Typewriter start={sequence >= 1} onComplete={() => setSequence(2)} text="First, we convert our specific normal distribution into the Standard Normal Distribution (where μ=0, σ=1). This allows us to map our raw values (X) to a universal scale using the Z-score formula." delay={15} />
                          </p>
                          
                          {/* STEP 2/3: Formulas type sequentially */}
                          {calculation.type === 'between' ? (
                            <div className="space-y-2">
                              <div className={`flex justify-between items-center bg-gray-50 p-2 rounded transition-opacity ${sequence >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                                <span className="text-xs font-bold text-gray-500">LOWER BOUND:</span>
                                <span className="font-mono font-bold text-gray-800">
                                  <Typewriter start={sequence >= 2} onComplete={() => setSequence(3)} text={calculation.rawFormula1} delay={25} />
                                </span>
                              </div>
                              <div className={`flex justify-between items-center bg-gray-50 p-2 rounded transition-opacity ${sequence >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                                <span className="text-xs font-bold text-gray-500">UPPER BOUND:</span>
                                <span className="font-mono font-bold text-gray-800">
                                  <Typewriter start={sequence >= 3} onComplete={() => setSequence(4)} text={calculation.rawFormula2} delay={25} />
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className={`flex justify-between items-center bg-gray-50 p-2 rounded mt-2 transition-opacity ${sequence >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                              <span className="text-xs font-bold text-gray-500">FORMULA:</span>
                              <span className="font-mono font-bold text-gray-800">
                                <Typewriter start={sequence >= 2} onComplete={() => setSequence(4)} text={calculation.type === 'less' ? calculation.rawFormula2 : calculation.rawFormula1} delay={25} />
                              </span>
                            </div>
                          )}
                        </div>

                        {/* STEP 4/5: Table Lookup Explanation */}
                        {sequence >= 4 && (
                          <div className="bg-white p-4 border-l-4 border-yellow-400 rounded shadow-sm animate-fade-in">
                            <p className="text-sm font-semibold text-yellow-800 mb-2">Step 2: Z-Table Lookup</p>
                            <p className="text-xs text-gray-600 mb-3 leading-relaxed min-h-[40px]">
                              <Typewriter start={sequence >= 4} onComplete={() => { setSequence(5); triggerTableHighlight(); }} text="We map these scores to the Z-Table below. The first two digits determine the row, and the final decimal determines the column. The intersection gives us the area probability." delay={15} />
                            </p>
                            
                            <div className={`transition-opacity duration-500 ${sequence >= 5 ? 'opacity-100' : 'opacity-0'}`}>
                              {calculation.type === 'between' ? (
                                <div className="flex gap-4 justify-center mt-2">
                                  <div className="bg-yellow-50 px-4 py-2 rounded border border-yellow-200 flex-1 flex justify-between items-center">
                                    <span className="text-xs font-bold text-yellow-700">Z₁ SCORE:</span>
                                    <span className="font-mono font-black text-gray-900"><Typewriter text={calculation.z1} /></span>
                                  </div>
                                  <div className="bg-yellow-50 px-4 py-2 rounded border border-yellow-200 flex-1 flex justify-between items-center">
                                    <span className="text-xs font-bold text-yellow-700">Z₂ SCORE:</span>
                                    <span className="font-mono font-black text-gray-900"><Typewriter text={calculation.z2} /></span>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-yellow-50 px-4 py-2 rounded border border-yellow-200 flex justify-between items-center mt-2">
                                  <span className="text-xs font-bold text-yellow-700">Z SCORE:</span>
                                  <span className="font-mono font-black text-gray-900"><Typewriter text={calculation.type === 'less' ? calculation.z2 : calculation.z1} /></span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* STEP 6: Final Result */}
                        {sequence >= 6 && (
                          <div className="pt-2 animate-fade-in">
                            <p className="text-xs text-gray-500 text-center mb-2 leading-relaxed px-4 min-h-[40px]">
                              <Typewriter start={sequence >= 6} text="This final percentage represents the total shaded area under the bell curve relative to the whole (100%)." delay={15} />
                            </p>
                            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200 text-center shadow-inner relative overflow-hidden animate-slide-up">
                              <div className="absolute top-0 left-0 w-full h-1 bg-[#0f9d58]"></div>
                              <p className="text-xs font-bold text-green-800 mb-1 uppercase tracking-widest">
                                {calculation.type === 'between' && `Area Probability P(${calculation.x1} < X < ${calculation.x2})`}
                                {calculation.type === 'less' && `Area Probability P(X < ${calculation.x2})`}
                                {calculation.type === 'greater' && `Area Probability P(X > ${calculation.x1})`}
                              </p>
                              <p className="text-5xl text-[#0f9d58] font-black tracking-tight drop-shadow-sm">{calculation.prob}<span className="text-3xl text-gray-400 font-bold">%</span></p>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-dashed border-green-200 p-6 flex flex-col items-center justify-center h-full rounded-xl opacity-60">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                        <span className="text-green-500 text-2xl">📊</span>
                      </div>
                      <p className="text-gray-500 text-center font-medium">Calculation results and steps will appear here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LECTURE EXAMPLE CARD */}
              <div className="mt-6 border border-blue-200 bg-blue-50 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex justify-between items-center mb-3 pl-2">
                  <h4 className="font-bold text-blue-900 flex items-center gap-2 text-lg">
                    <span>🎓</span> Lecture Example
                  </h4>
                  <button onClick={loadLectureExample} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors uppercase tracking-wider">
                    Load Data
                  </button>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed italic pl-2">
                  "Suppose the height of Indian men is approximately Normally distributed with a mean of 68 inches and a Standard Deviation of 2.5. Find the percentage of Indian men who are between 66 to 71 inches tall."
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* --- DYNAMIC LIVE TABLE (WITH SPACED TILES) --- */}
        {calculation && (
          <div ref={tableRef} className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden animate-fade-in scroll-mt-10 p-4 md:p-6">
            <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-xl">Live Z-Table Scanner</h3>
                <p className="text-sm text-gray-500 mt-1">Tracking intersection for {calculation.type === 'between' ? `Z₂ = ${calculation.z2}` : `Z = ${calculation.type === 'less' ? calculation.z2 : calculation.z1}`}</p>
              </div>
              <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-4 py-1.5 rounded-full animate-pulse border border-yellow-300 shadow-sm">SCANNING ACTIVE</span>
            </div>
            
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar pb-4">
              <table className="w-full text-center border-separate border-spacing-1.5 text-[#4b5563] font-sans text-sm">
                <thead className="sticky top-0 z-30">
                  <tr>
                    <th className="p-3 bg-gray-200 font-bold text-gray-900 rounded-lg shadow-sm">Z</th>
                    {zCols.map(col => {
                      const isColActive = highlightZ.col === col.toFixed(2);
                      return (
                        <th key={col} style={{ backgroundColor: isColActive ? '#0f9d58' : '', color: isColActive ? 'white' : '' }} className="p-3 bg-gray-100 font-bold rounded-lg shadow-sm transition-colors duration-300">
                          {col === 0 ? "0" : col.toString()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {zRows.map(rowVal => {
                    const isRowActive = highlightZ.row === rowVal;
                    return (
                      <tr key={rowVal} id={`row-${rowVal}`}>
                        <td style={{ backgroundColor: isRowActive ? '#0f9d58' : '#f3f4f6', color: isRowActive ? 'white' : '#1f2937' }} className="p-3 font-bold rounded-lg sticky left-0 z-10 shadow-sm transition-colors duration-300">
                          {rowVal === "0.0" ? "0" : rowVal}
                        </td>
                        {zCols.map(colVal => {
                          const z = parseFloat(rowVal) + colVal;
                          const isColActive = highlightZ.col === colVal.toFixed(2);
                          const isMatch = isRowActive && isColActive;
                          
                          return (
                            <td key={colVal} 
                                style={{ 
                                  backgroundColor: isMatch ? '#fde047' : (isRowActive || isColActive ? '#fefce8' : '#ffffff'), 
                                  color: isMatch ? '#000000' : '#4b5563',
                                  fontWeight: isMatch ? '900' : 'normal',
                                  transform: isMatch ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: isMatch ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                  zIndex: isMatch ? 20 : 1
                                }} 
                                className="p-3 border border-gray-100 rounded-lg transition-all duration-500 relative">
                              {getZTableValue(z)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
