import React, { useState, useEffect } from 'react';
import { X, FlaskConical, CheckCircle2, Cpu, FileText, Layers, Code, Play, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';

export default function LabShowcaseDrawer({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('exp31');
  const { user } = useAuth();
  const { alerts, stats } = useAlerts();

  // Exp 3.1 State: Shopping / Clinical Supplies Reusable Component Demo
  const [itemQty, setItemQty] = useState(2);
  const unitPrice = 45.00;
  // Dynamic JSX calculations: subtotal, tax, final price
  const subtotal = itemQty * unitPrice;
  const taxRate = 0.085;
  const taxAmount = subtotal * taxRate;
  const finalPrice = subtotal + taxAmount;

  // Exp 3.1 State: Student / Patient Marks calculation with JSX expressions
  const studentScores = [88, 92, 79, 95];
  const totalScore = studentScores.reduce((acc, curr) => acc + curr, 0);
  const avgScore = (totalScore / studentScores.length).toFixed(1);

  // Exp 3.1: Functional vs Class Component Toggle
  const [componentType, setComponentType] = useState('functional');

  // Exp 3.2 State: Hooks Playground
  const [hookCounter, setHookCounter] = useState(0);
  const [showSecretTelemetry, setShowSecretTelemetry] = useState(false);

  // Exp 4.1 State: Backend Benchmark and File Ops
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [fileOpsResult, setFileOpsResult] = useState(null);
  const [mathOperation, setMathOperation] = useState({ op: 'map', sbp: 130, dbp: 85 });
  const [mathResult, setMathResult] = useState(null);

  const runBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch('/api/benchmark/io?iterations=100');
      const data = await res.json();
      setBenchmarkResult(data);
    } catch (err) {
      setBenchmarkResult({ error: err.message });
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const fetchFileOps = async () => {
    try {
      const res = await fetch('/api/files/audit-log');
      const data = await res.json();
      setFileOpsResult(data);
    } catch (err) {
      setFileOpsResult({ error: err.message });
    }
  };

  const testMathModule = async () => {
    try {
      const res = await fetch('/api/math/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'map',
          systolic: mathOperation.sbp,
          diastolic: mathOperation.dbp
        })
      });
      const data = await res.json();
      setMathResult(data.result);
    } catch (err) {
      setMathResult({ error: err.message });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFileOps();
      testMathModule();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lab-drawer-overlay">
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#005e9e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <FlaskConical size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Curriculum Lab Showcase</h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Experiments 3.1, 3.2, 3.3 & 4.1</p>
          </div>
        </div>
        <button onClick={onClose} style={{ color: '#94a3b8', padding: '6px' }}>
          <X size={20} />
        </button>
      </div>

      {/* Navigation Tabs (Clean 4-column Segmented Control) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', padding: '6px', gap: '6px' }}>
        <button
          onClick={() => setActiveTab('exp31')}
          style={{
            padding: '8px 4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '8px',
            background: activeTab === 'exp31' ? '#005e9e' : '#ffffff',
            color: activeTab === 'exp31' ? '#ffffff' : '#475569',
            border: activeTab === 'exp31' ? '1px solid #005e9e' : '1px solid #cbd5e1',
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          Exp 3.1
        </button>
        <button
          onClick={() => setActiveTab('exp32')}
          style={{
            padding: '8px 4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '8px',
            background: activeTab === 'exp32' ? '#005e9e' : '#ffffff',
            color: activeTab === 'exp32' ? '#ffffff' : '#475569',
            border: activeTab === 'exp32' ? '1px solid #005e9e' : '1px solid #cbd5e1',
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          Exp 3.2
        </button>
        <button
          onClick={() => setActiveTab('exp33')}
          style={{
            padding: '8px 4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '8px',
            background: activeTab === 'exp33' ? '#005e9e' : '#ffffff',
            color: activeTab === 'exp33' ? '#ffffff' : '#475569',
            border: activeTab === 'exp33' ? '1px solid #005e9e' : '1px solid #cbd5e1',
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          Exp 3.3
        </button>
        <button
          onClick={() => setActiveTab('exp41')}
          style={{
            padding: '8px 4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '8px',
            background: activeTab === 'exp41' ? '#005e9e' : '#ffffff',
            color: activeTab === 'exp41' ? '#ffffff' : '#475569',
            border: activeTab === 'exp41' ? '1px solid #005e9e' : '1px solid #cbd5e1',
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          Exp 4.1
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* EXP 3.1 TAB */}
        {activeTab === 'exp31' && (
          <>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>1. Reusable Product Card & JSX Expressions</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>
                Shopping Product Card with dynamic subtotal, tax calculation (8.5%), and final price.
              </p>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Telemetry Sensor Patch Pack</span>
                  <span style={{ fontWeight: 700, color: '#005e9e' }}>${unitPrice.toFixed(2)} / pack</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Quantity:</span>
                  <button
                    onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                    style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{itemQty}</span>
                  <button
                    onClick={() => setItemQty(itemQty + 1)}
                    style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                  >
                    +
                  </button>
                </div>
                <div style={{ fontSize: '0.82rem', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Subtotal ({itemQty} items):</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Clinical Tax (8.5%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: '4px' }}>
                    <span>Final Price:</span>
                    <span style={{ color: '#16a34a' }}>${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>2. Student Profile Marks / Scoring (JSX Expressions)</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Subjects Score List:</span>
                <span>[{studentScores.join(', ')}]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Total Calculated Marks:</span>
                <span style={{ fontWeight: 700 }}>{totalScore} / 400</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Average Marks:</span>
                <span style={{ fontWeight: 700, color: '#005e9e' }}>{avgScore}%</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>3. Functional vs. Class Component Comparison</h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  onClick={() => setComponentType('functional')}
                  className={`btn-secondary-outline ${componentType === 'functional' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    fontSize: '0.78rem',
                    background: componentType === 'functional' ? '#005e9e' : '#ffffff',
                    color: componentType === 'functional' ? '#ffffff' : '#334155'
                  }}
                >
                  Functional Component
                </button>
                <button
                  onClick={() => setComponentType('class')}
                  className={`btn-secondary-outline ${componentType === 'class' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    fontSize: '0.78rem',
                    background: componentType === 'class' ? '#005e9e' : '#ffffff',
                    color: componentType === 'class' ? '#ffffff' : '#334155'
                  }}
                >
                  Class Component
                </button>
              </div>
              <div style={{ fontSize: '0.78rem', background: '#1e293b', color: '#f8fafc', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}>
                {componentType === 'functional' ? (
                  <pre>{`// Modern Functional Component\nfunction PatientVitals(props) {\n  const [hr, setHr] = useState(72);\n  return <div>Heart Rate: {hr} bpm</div>;\n}`}</pre>
                ) : (
                  <pre>{`// Legacy Class Component\nclass PatientVitals extends React.Component {\n  state = { hr: 72 };\n  render() {\n    return <div>Heart Rate: {this.state.hr} bpm</div>;\n  }\n}`}</pre>
                )}
              </div>
            </div>
          </>
        )}

        {/* EXP 3.2 TAB */}
        {activeTab === 'exp32' && (
          <>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>1. useState (Counter & Show/Hide Toggle)</h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Telemetry Counter: {hookCounter}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setHookCounter(c => c - 1)}
                    style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}
                  >
                    -
                  </button>
                  <button
                    onClick={() => setHookCounter(c => c + 1)}
                    style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowSecretTelemetry(!showSecretTelemetry)}
                style={{ fontSize: '0.8rem', color: '#005e9e', textDecoration: 'underline' }}
              >
                {showSecretTelemetry ? 'Hide Secret Stream' : 'Show Secret Telemetry Stream'}
              </button>
              {showSecretTelemetry && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#e0f2fe', borderRadius: '6px', fontSize: '0.78rem', color: '#0369a1' }}>
                  Biometric telemetry bus socket #4489 active. Packet sync OK.
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>2. useContext & useReducer State</h4>
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>useContext Current Clinician:</span>
                  <span style={{ fontWeight: 600 }}>{user?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>useReducer Active Alerts:</span>
                  <span style={{ fontWeight: 600 }}>{alerts.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>useMemo Unack Count:</span>
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{stats.unacknowledged}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>3. useEffect (Title Sync & Mount Logger)</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Browser tab document.title dynamically updates on alert dispatch.
                Current document.title: <code>{document.title}</code>
              </p>
            </div>
          </>
        )}

        {/* EXP 3.3 TAB */}
        {activeTab === 'exp33' && (
          <>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>1. React Router v6 Architecture</h4>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <code>/login</code> — Split-screen authentication form
                </div>
                <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <code>/patients</code> — Patient metrics & table dashboard
                </div>
                <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <code>/alerts</code> — Real-time telemetry alerts & queue
                </div>
                <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <code>/patient-profiles/:id</code> — 3D Organ & Vital trends
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>2. Controlled Form Validation Rules</h4>
              <ul style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><b>Required fields check:</b> Name (min 3 chars), Age, Condition.</li>
                <li><b>Age validation range:</b> 1 ≤ Age ≤ 120 (strictly enforced).</li>
                <li><b>Vital bounds check:</b> Systolic 50-250, Diastolic 30-150, HR 30-220, SpO2 50-100%.</li>
                <li><b>useRef integration:</b> Automatically focuses the name input field when modal opens.</li>
              </ul>
            </div>
          </>
        )}

        {/* EXP 4.1 TAB */}
        {activeTab === 'exp41' && (
          <>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#005e9e' }}>1. Blocking vs Non-Blocking I/O Benchmark</h4>
                <button
                  onClick={runBenchmark}
                  disabled={benchmarkLoading}
                  className="btn-primary-blue"
                  style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Play size={13} />
                  <span>{benchmarkLoading ? 'Running...' : 'Run Test'}</span>
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px' }}>
                Executes 100 concurrent reads via <code>fs.readFileSync</code> vs. <code>fs.promises.readFile</code>.
              </p>
              {benchmarkResult && (
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Blocking (fs.readFileSync):</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>{benchmarkResult.blockingSyncMs} ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Non-Blocking (fs.promises.readFile):</span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>{benchmarkResult.nonBlockingAsyncMs} ms</span>
                  </div>
                  <div style={{ color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <b>Finding:</b> {benchmarkResult.conclusion}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>2. Custom Math Module (vitalMath.js)</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px' }}>
                Mean Arterial Pressure (MAP) formula: <code>(2 * DBP + SBP) / 3</code>
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="number"
                  placeholder="SBP (130)"
                  value={mathOperation.sbp}
                  onChange={e => setMathOperation(prev => ({ ...prev, sbp: e.target.value }))}
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100px' }}
                />
                <span>/</span>
                <input
                  type="number"
                  placeholder="DBP (85)"
                  value={mathOperation.dbp}
                  onChange={e => setMathOperation(prev => ({ ...prev, dbp: e.target.value }))}
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100px' }}
                />
                <button
                  onClick={testMathModule}
                  className="btn-secondary-outline"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Calculate
                </button>
              </div>
              {mathResult && (
                <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                  <span>MAP Result: <b>{mathResult.map} mm Hg</b> — Status: <b style={{ color: '#005e9e' }}>{mathResult.status}</b></span>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#005e9e' }}>3. File Operations & Readline Stream</h4>
              {fileOpsResult ? (
                <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Audit Log Lines: <b>{fileOpsResult.totalLines} lines</b></div>
                  <div>Permissions: <b>Read: {fileOpsResult.fileInfo?.readable ? 'OK' : 'DENIED'}, Write: {fileOpsResult.fileInfo?.writable ? 'OK' : 'DENIED'}</b></div>
                  <div style={{ marginTop: '4px', color: '#64748b' }}>Latest stream line:</div>
                  <div style={{ background: '#1e293b', color: '#f8fafc', padding: '6px', borderRadius: '6px', fontSize: '0.72rem', overflowX: 'auto' }}>
                    {fileOpsResult.readlineStreamLogs?.[0]?.content || 'Reading audit log...'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Connecting to file ops service...</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
