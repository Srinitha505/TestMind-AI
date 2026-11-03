
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, Bug, CheckCircle2,
  CircleDot, Cpu, FilePlus2, FlaskConical, Gauge,
  LayoutDashboard, ListChecks, RefreshCw, ShieldCheck,
  Sparkles, Trash2, X, Save, Clock, Ban, FileText, Download,
  FileSpreadsheet
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import api from './api'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const emptyBug = {
  title: '',
  description: '',
  steps: '',
  expected: '',
  actual: '',
  environment: 'Chrome / Windows 11'
}

const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bugs', label: 'Bug intelligence', icon: Bug },
  { id: 'cases', label: 'Test case studio', icon: FlaskConical },
  { id: 'reports', label: 'QA reports', icon: FileText }
]

const severityColor = {
  Critical: '#fb7185',
  High: '#fb923c',
  Medium: '#fbbf24',
  Low: '#34d399'
}

const executionColors = {
  Pass: '#34d399',
  Fail: '#fb7185',
  Blocked: '#fbbf24',
  'Not Run': '#94a3b8'
}

function App() {
  const [page, setPage] = useState('overview')
  const [bugs, setBugs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBug, setShowBug] = useState(false)
  const [form, setForm] = useState(emptyBug)
  const [saving, setSaving] = useState(false)
  const [requirement, setRequirement] = useState('A registered user can sign in with a valid email and password. Invalid credentials show an error. After five failed attempts the account is temporarily locked.')
  const [cases, setCases] = useState([])
  const [generating, setGenerating] = useState(false)
  const [latestAnalysis, setLatestAnalysis] = useState(null)
  const [testSummary, setTestSummary] = useState(null)
  const [executionDrafts, setExecutionDrafts] = useState({})
  const [savingExecution, setSavingExecution] = useState(null)
  const [editingCaseId, setEditingCaseId] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [savingCase, setSavingCase] = useState(false)
  const [deletingCase, setDeletingCase] = useState(null)

  function makeDrafts(items) {
    const drafts = {}

    items.forEach(item => {
      drafts[item.id] = {
        status: item.status || 'Not Run',
        actual_result: item.actual_result || '',
        execution_notes: item.execution_notes || ''
      }
    })

    return drafts
  }

  async function refreshTestData() {
    const [testResponse, summaryResponse] = await Promise.all([
      api.get('/test-cases'),
      api.get('/test-cases/summary')
    ])

    const savedCases = testResponse.data.test_cases || []

    setCases(savedCases)
    setTestSummary(summaryResponse.data)
    setExecutionDrafts(makeDrafts(savedCases))
  }

  async function refresh() {
    setLoading(true)
    setError('')

    try {
      const [bugResponse, analyticsResponse] = await Promise.all([
        api.get('/bugs'),
        api.get('/analytics')
      ])

      setBugs(bugResponse.data)
      setAnalytics(analyticsResponse.data)

      await refreshTestData()
    } catch (e) {
      setError('Cannot reach the API. Check that the FastAPI backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function submitBug(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await api.post('/bugs', form)
      setLatestAnalysis(response.data)
      setForm(emptyBug)
      setShowBug(false)
      await refresh()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not analyse bug. Check that the local model has been trained.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(bug, status) {
    try {
      await api.patch(`/bugs/${bug.id}/status`, { status })
      await refresh()
    } catch {
      setError('Unable to update bug status.')
    }
  }

  async function removeBug(id) {
    try {
      await api.delete(`/bugs/${id}`)
      await refresh()
    } catch {
      setError('Unable to delete bug.')
    }
  }

  async function generateCases(e) {
    e.preventDefault()
    setGenerating(true)
    setError('')

    try {
      await api.post('/test-cases/generate', { requirement })
      await refreshTestData()
    } catch (e) {
      setError(e.response?.data?.detail || 'Test case generation failed. Check the backend.')
    } finally {
      setGenerating(false)
    }
  }

  function updateDraft(caseId, field, value) {
    setExecutionDrafts(previous => ({
      ...previous,
      [caseId]: {
        ...previous[caseId],
        [field]: value
      }
    }))
  }

  async function saveExecution(testCase) {
    const draft = executionDrafts[testCase.id]

    if (!draft) return

    setSavingExecution(testCase.id)
    setError('')

    try {
      await api.patch(`/test-cases/${testCase.id}/execution`, {
        status: draft.status,
        actual_result: draft.actual_result,
        execution_notes: draft.execution_notes
      })

      await refreshTestData()
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to save test execution.')
    } finally {
      setSavingExecution(null)
    }
  }

  function startEditing(testCase) {
    setEditingCaseId(testCase.id)
    setEditDraft({
      title: testCase.title,
      steps: testCase.steps,
      expected_result: testCase.expected_result,
      priority: testCase.priority,
      category: testCase.category
    })
  }

  function updateEditDraft(field, value) {
    setEditDraft(previous => ({
      ...previous,
      [field]: value
    }))
  }

  function cancelEditing() {
    setEditingCaseId(null)
    setEditDraft({})
  }

  async function saveTestCase(testCase) {
    setSavingCase(true)
    setError('')

    try {
      await api.patch(`/test-cases/${testCase.id}`, editDraft)
      cancelEditing()
      await refreshTestData()
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to update test case.')
    } finally {
      setSavingCase(false)
    }
  }

  async function deleteTestCase(testCase) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${testCase.case_id}? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeletingCase(testCase.id)
    setError('')

    try {
      await api.delete(`/test-cases/${testCase.id}`)
      if (editingCaseId === testCase.id) cancelEditing()
      await refreshTestData()
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to delete test case.')
    } finally {
      setDeletingCase(null)
    }
  }

  function exportPdfReport() {
    const summary = testSummary || { total: cases.length, passed: 0, failed: 0, blocked: 0, not_run: cases.length, executed: 0, pass_percentage: 0 }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const generatedAt = new Date().toLocaleString()

    doc.setFontSize(20)
    doc.text('TestMind AI - QA Execution Report', 14, 18)
    doc.setFontSize(10)
    doc.text(`Generated: ${generatedAt}`, 14, 25)
    doc.text('Report source: saved TestMind AI workspace records', 14, 31)

    autoTable(doc, {
      startY: 38,
      head: [['Total', 'Passed', 'Failed', 'Blocked', 'Not Run', 'Executed', 'Pass Rate']],
      body: [[summary.total, summary.passed, summary.failed, summary.blocked, summary.not_run, summary.executed, `${summary.pass_percentage}%`]],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [45, 55, 85] }
    })

    const rows = cases.map(testCase => [
      testCase.case_id || testCase.id,
      testCase.title || '',
      testCase.priority || '',
      testCase.category || '',
      testCase.status || 'Not Run',
      testCase.actual_result || '',
      testCase.execution_notes || ''
    ])

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Case ID', 'Test case', 'Priority', 'Category', 'Status', 'Actual result', 'Execution notes']],
      body: rows.length ? rows : [['-', 'No test cases available', '-', '-', '-', '-', '-']],
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [45, 55, 85] },
      columnStyles: { 1: { cellWidth: 48 }, 5: { cellWidth: 48 }, 6: { cellWidth: 42 } },
      didDrawPage: data => {
        const pageCount = doc.internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.text(`TestMind AI | Page ${data.pageNumber} of ${pageCount}`, 14, doc.internal.pageSize.height - 7)
      }
    })

    doc.save(`TestMind_AI_QA_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  function exportExcelReport() {
    const summary = testSummary || { total: cases.length, passed: 0, failed: 0, blocked: 0, not_run: cases.length, executed: 0, pass_percentage: 0 }
    const summaryRows = [
      ['Metric', 'Value'],
      ['Generated at', new Date().toLocaleString()],
      ['Total test cases', summary.total],
      ['Passed', summary.passed],
      ['Failed', summary.failed],
      ['Blocked', summary.blocked],
      ['Not run', summary.not_run],
      ['Executed', summary.executed],
      ['Pass rate (%)', summary.pass_percentage]
    ]

    const testCaseRows = cases.map(testCase => ({
      'Case ID': testCase.case_id || testCase.id,
      'Title': testCase.title || '',
      'Priority': testCase.priority || '',
      'Category': testCase.category || '',
      'Steps': testCase.steps || '',
      'Expected result': testCase.expected_result || '',
      'Status': testCase.status || 'Not Run',
      'Actual result': testCase.actual_result || '',
      'Execution notes': testCase.execution_notes || '',
      'Created at': testCase.created_at || '',
      'Executed at': testCase.executed_at || ''
    }))

    const bugRows = bugs.map(bug => ({
      'Bug ID': bug.id,
      'Title': bug.title || '',
      'Severity': bug.severity || '',
      'Confidence': bug.confidence ?? '',
      'Status': bug.status || '',
      'Description': bug.description || '',
      'Environment': bug.environment || '',
      'Created at': bug.created_at || ''
    }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Execution Summary')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(testCaseRows), 'Test Cases')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bugRows), 'Bug Reports')
    XLSX.writeFile(workbook, `TestMind_AI_QA_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const chartSeverity = useMemo(
    () => analytics
      ? Object.entries(analytics.by_severity).map(([name, value]) => ({ name, value }))
      : [],
    [analytics]
  )

  const chartStatus = useMemo(
    () => analytics
      ? Object.entries(analytics.by_status).map(([name, value]) => ({ name, value }))
      : [],
    [analytics]
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={21} /></div>
          <div><b>testmind<span>.ai</span></b><small>QUALITY ENGINEERING</small></div>
        </div>

        <div className="workspace">
          <div className="workspace-dot" /> LOCAL WORKSPACE <span className="live">LIVE</span>
        </div>

        <div className="nav-label">WORKSPACE</div>

        {nav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={18} />
            {item.label}
            {page === item.id && <span className="nav-active" />}
          </button>
        ))}

        <div className="side-bottom">
          <div className="ai-card">
            <div className="ai-icon"><Cpu size={17} /></div>
            <b>Local AI engine</b>
            <p>Predictions run on your machine. No external AI API.</p>
            <span><i /> MODEL CONNECTED</span>
          </div>

          <div className="profile">
            <div className="avatar">TM</div>
            <div><b>TestMind Workspace</b><small>Personal edition</small></div>
            <CircleDot size={16} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> <b>{nav.find(n => n.id === page)?.label}</b>
          </div>

          <div className="top-actions">
            <span className="local-pill"><span /> Local AI active</span>
            <button className="icon-btn" onClick={refresh} title="Refresh">
              <RefreshCw size={17} />
            </button>
            <button className="primary-btn" onClick={() => setShowBug(true)}>
              <FilePlus2 size={17} /> Report a bug
            </button>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="error-banner">
              <AlertTriangle size={17} />
              {error}
              <button onClick={() => setError('')}><X size={16} /></button>
            </div>
          )}

          {latestAnalysis && (
            <ProbabilityPanel
              analysis={latestAnalysis}
              onClose={() => setLatestAnalysis(null)}
            />
          )}

          {page === 'overview' && (
            <Overview
              analytics={analytics}
              bugs={bugs}
              chartSeverity={chartSeverity}
              chartStatus={chartStatus}
              loading={loading}
              setPage={setPage}
              updateStatus={updateStatus}
            />
          )}

          {page === 'bugs' && (
            <BugsPage
              bugs={bugs}
              loading={loading}
              updateStatus={updateStatus}
              removeBug={removeBug}
              openForm={() => setShowBug(true)}
            />
          )}

          {page === 'cases' && (
            <CasesPage
              requirement={requirement}
              setRequirement={setRequirement}
              cases={cases}
              generating={generating}
              generateCases={generateCases}
              testSummary={testSummary}
              executionDrafts={executionDrafts}
              updateDraft={updateDraft}
              saveExecution={saveExecution}
              savingExecution={savingExecution}
              editingCaseId={editingCaseId}
              editDraft={editDraft}
              startEditing={startEditing}
              updateEditDraft={updateEditDraft}
              cancelEditing={cancelEditing}
              saveTestCase={saveTestCase}
              savingCase={savingCase}
              deleteTestCase={deleteTestCase}
              deletingCase={deletingCase}
            />
          )}

          {page === 'reports' && (
            <ReportsPage
              cases={cases}
              bugs={bugs}
              testSummary={testSummary}
              exportPdfReport={exportPdfReport}
              exportExcelReport={exportExcelReport}
            />
          )}
        </div>
      </main>

      {showBug && (
        <div
          className="modal-backdrop"
          onMouseDown={e => e.target === e.currentTarget && setShowBug(false)}
        >
          <form className="modal" onSubmit={submitBug}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">AI-POWERED INTAKE</span>
                <h2>Report a software bug</h2>
                <p>Describe the issue. Local ML will estimate its severity.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowBug(false)}>
                <X />
              </button>
            </div>

            <label>
              Bug title
              <input
                required
                minLength="3"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Checkout crashes after clicking Pay"
              />
            </label>

            <label>
              Description
              <textarea
                required
                minLength="10"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What happened? Include the impact and symptoms."
              />
            </label>

            <div className="two-fields">
              <label>
                Steps to reproduce
                <textarea
                  value={form.steps}
                  onChange={e => setForm({ ...form, steps: e.target.value })}
                  placeholder="1. Open checkout..."
                />
              </label>
              <label>
                Expected result
                <textarea
                  value={form.expected}
                  onChange={e => setForm({ ...form, expected: e.target.value })}
                  placeholder="Payment confirmation appears..."
                />
              </label>
            </div>

            <label>
              Actual result
              <textarea
                value={form.actual}
                onChange={e => setForm({ ...form, actual: e.target.value })}
                placeholder="The page returns HTTP 500..."
              />
            </label>

            <label>
              Environment
              <input
                value={form.environment}
                onChange={e => setForm({ ...form, environment: e.target.value })}
              />
            </label>

            <div className="modal-footer">
              <span><ShieldCheck size={15} /> Analysed locally on your machine</span>
              <button className="primary-btn" disabled={saving}>
                {saving ? 'Analysing...' : <><Sparkles size={16} /> Analyse & save bug</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function ProbabilityPanel({ analysis, onClose }) {
  const probabilities = analysis.severity_probabilities || {}
  const confidence = Number(analysis.confidence || 0)
  const level = analysis.confidence_level || (
    confidence < 0.5 ? 'Low' : confidence < 0.7 ? 'Moderate' : 'Higher'
  )
  const isLow = confidence < 0.5
  const features = analysis.ai_explanation || []

  return (
    <section
      className="panel"
      style={{
        marginBottom: 24,
        border: '1px solid #6555b9',
        background: 'linear-gradient(120deg,#171b34,#151d31)'
      }}
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            LOCAL ML ANALYSIS · BUG #{String(analysis.id).padStart(4, '0')}
          </span>
          <h3 style={{ marginTop: 7 }}>AI severity analysis</h3>
          <p>{analysis.title}</p>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close analysis">
          <X size={17} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', margin: '18px 0' }}>
        <div>
          <span style={{ color: '#9ca8c0', fontSize: 12 }}>PREDICTED SEVERITY</span>
          <div style={{ marginTop: 8 }}><Severity value={analysis.severity} /></div>
        </div>
        <div>
          <span style={{ color: '#9ca8c0', fontSize: 12 }}>MODEL CONFIDENCE</span>
          <div style={{ fontSize: 27, fontWeight: 750, marginTop: 4 }}>
            {(confidence * 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca8c0', fontSize: 12 }}>CONFIDENCE LEVEL</span>
          <div style={{ marginTop: 8, fontWeight: 700, color: isLow ? '#fbbf24' : '#a5b4fc' }}>
            {level}
          </div>
        </div>
      </div>

      {isLow && (
        <div style={{ padding: 13, borderRadius: 10, background: '#854d0e22', border: '1px solid #d977064d', color: '#fcd34d', display: 'flex', gap: 9, alignItems: 'center', marginBottom: 18, fontSize: 13 }}>
          <AlertTriangle size={18} />
          Low confidence: review the bug details and confirm the severity manually.
        </div>
      )}

      {!isLow && confidence < 0.7 && (
        <div style={{ padding: 13, borderRadius: 10, background: '#854d0e22', border: '1px solid #d977064d', color: '#fcd34d', marginBottom: 18, fontSize: 13 }}>
          Moderate confidence: treat this as an estimate and review before prioritising.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {['Critical', 'High', 'Medium', 'Low'].map(name => {
          const value = Number(probabilities[name] || 0)

          return (
            <div key={name} style={{ background: '#0d1425', borderRadius: 10, padding: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9, fontSize: 13 }}>
                <span>{name}</span><b>{(value * 100).toFixed(2)}%</b>
              </div>
              <div style={{ height: 7, background: '#29334a', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${value * 100}%`, height: '100%', background: severityColor[name], borderRadius: 10 }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 9px', fontSize: 14 }}>Influential text features</h4>
        <p style={{ color: '#9ca8c0', fontSize: 12, margin: '0 0 10px' }}>
          Words and phrases contributing to the model's classification. These are not a natural-language explanation.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {features.length
            ? features.map((feature, index) => (
              <span key={`${feature}-${index}`} style={{ background: '#29244b', color: '#c4b5fd', border: '1px solid #51458b', borderRadius: 20, padding: '6px 11px', fontSize: 12 }}>
                {feature}
              </span>
            ))
            : <span style={{ color: '#9ca8c0', fontSize: 13 }}>No influential features available.</span>
          }
        </div>
      </div>

      <p style={{ color: '#8491aa', fontSize: 11, margin: '17px 0 0' }}>
        Predictions are estimates from a small illustrative training dataset. Review severity manually before taking action.
      </p>
    </section>
  )
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function Metric({ label, value, detail, icon: Icon, tone = 'blue' }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={19} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? '—'}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  )
}

function Overview({ analytics, bugs, chartSeverity, chartStatus, loading, setPage, updateStatus }) {
  return (
    <>
      <PageHeading
        eyebrow="ENGINEERING OVERVIEW"
        title="Quality at a glance"
        subtitle="Your software quality command centre. Monitor defects, risk and test readiness."
        action={
          <button className="outline-btn" onClick={() => setPage('cases')}>
            <ListChecks size={16} /> Open test studio <ArrowUpRight size={15} />
          </button>
        }
      />

      <div className="metric-grid">
        <Metric label="Total defects" value={analytics?.total_bugs ?? 0} detail="All reported issues" icon={Bug} tone="blue" />
        <Metric label="Open defects" value={analytics?.open_bugs ?? 0} detail="Require attention" icon={AlertTriangle} tone="rose" />
        <Metric label="Resolved" value={analytics?.resolved_bugs ?? 0} detail="Successfully closed" icon={CheckCircle2} tone="green" />
        <Metric label="Model confidence" value={analytics ? `${Math.round(analytics.average_model_confidence * 100)}%` : '—'} detail="Average prediction confidence" icon={Gauge} tone="purple" />
      </div>

      <div className="section-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h3>Defects by severity</h3><p>Distribution of AI-classified issues</p></div>
            <span className="panel-tag">SEVERITY</span>
          </div>
          <div className="chart-wrap">
            {chartSeverity.length && analytics?.total_bugs
              ? <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={chartSeverity} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={4}>
                    {chartSeverity.map(e => <Cell key={e.name} fill={severityColor[e.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#151d31', border: '1px solid #2b3650', borderRadius: 10, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              : <EmptyChart text="Report bugs to see severity distribution" />
            }
          </div>
          <div className="legend">
            {chartSeverity.map(x => (
              <span key={x.name}><i style={{ background: severityColor[x.name] }} />{x.name}<b>{x.value}</b></span>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><h3>Workflow status</h3><p>Current defect lifecycle</p></div>
            <span className="panel-tag">STATUS</span>
          </div>
          <div className="chart-wrap">
            {chartStatus.length && analytics?.total_bugs
              ? <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartStatus} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#263149" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#8290aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#8290aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#151d31', border: '1px solid #2b3650', borderRadius: 10 }} />
                  <Bar dataKey="value" fill="#8b7cff" radius={[6, 6, 0, 0]} barSize={38} />
                </BarChart>
              </ResponsiveContainer>
              : <EmptyChart text="Status analytics appear when bugs are added" />
            }
          </div>
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div><h3>Recent bug reports</h3><p>Latest issues analysed by the local ML model</p></div>
          <button className="text-btn" onClick={() => setPage('bugs')}>View all <ArrowUpRight size={14} /></button>
        </div>
        <BugTable bugs={bugs.slice(0, 5)} updateStatus={updateStatus} />
        {!bugs.length && <EmptyChart text="No bugs yet. Add your first bug report to get started." />}
      </section>

      <div className="footnote">
        <Sparkles size={14} /> AI-generated severity is an estimate. Review predictions before taking action.
      </div>
    </>
  )
}

function EmptyChart({ text }) {
  return <div className="empty-chart"><div><Activity size={22} /></div>{text}</div>
}

function Severity({ value }) {
  return <span className={`severity ${value?.toLowerCase()}`}>{value || 'Unknown'}</span>
}

function BugTable({ bugs, updateStatus, removeBug }) {
  if (!bugs.length) return null

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ISSUE</th>
            <th>SEVERITY</th>
            <th>CONFIDENCE</th>
            <th>STATUS</th>
            {removeBug && <th />}
          </tr>
        </thead>
        <tbody>
          {bugs.map(b => (
            <tr key={b.id}>
              <td>
                <div className="bug-title">
                  <span className="bug-id">#{String(b.id).padStart(4, '0')}</span>
                  <b>{b.title}</b>
                  <small>{b.description}</small>
                </div>
              </td>
              <td><Severity value={b.severity} /></td>
              <td>
                <div className="confidence">
                  <span>{Math.round(b.confidence * 100)}%</span>
                  <i><em style={{ width: `${b.confidence * 100}%` }} /></i>
                </div>
              </td>
              <td>
                <select className="status-select" value={b.status} onChange={e => updateStatus(b, e.target.value)}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
              </td>
              {removeBug && (
                <td>
                  <button className="delete-btn" onClick={() => removeBug(b.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BugsPage({ bugs, loading, updateStatus, removeBug, openForm }) {
  return (
    <>
      <PageHeading
        eyebrow="DEFECT INTELLIGENCE"
        title="Bug intelligence"
        subtitle="Capture defects, review local ML predictions and manage resolution."
        action={<button className="primary-btn" onClick={openForm}><FilePlus2 size={16} /> New bug report</button>}
      />
      <div className="panel table-panel">
        <div className="panel-heading">
          <div><h3>All reported defects</h3><p>{bugs.length} records in your local database</p></div>
          <span className="panel-tag">LIVE DATABASE</span>
        </div>
        {bugs.length
          ? <BugTable bugs={bugs} updateStatus={updateStatus} removeBug={removeBug} />
          : <EmptyChart text="No defects recorded yet. Submit a bug to begin." />
        }
      </div>
    </>
  )
}

function CasesPage({
  requirement,
  setRequirement,
  cases,
  generating,
  generateCases,
  testSummary,
  executionDrafts,
  updateDraft,
  saveExecution,
  savingExecution,
  editingCaseId,
  editDraft,
  startEditing,
  updateEditDraft,
  cancelEditing,
  saveTestCase,
  savingCase,
  deleteTestCase,
  deletingCase
}) {
  const summary = testSummary || {
    total: cases.length,
    not_run: cases.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    executed: 0,
    pass_percentage: 0
  }

  return (
    <>
      <PageHeading
        eyebrow="TEST DESIGN WORKSPACE"
        title="Test case studio"
        subtitle="Generate, save and execute QA scenarios using your local TestMind AI engine."
      />

      <div className="metric-grid" style={{ marginBottom: 22 }}>
        <Metric label="Total test cases" value={summary.total} detail="Saved in local database" icon={ListChecks} tone="blue" />
        <Metric label="Passed" value={summary.passed} detail="Successfully executed" icon={CheckCircle2} tone="green" />
        <Metric label="Failed" value={summary.failed} detail="Require investigation" icon={AlertTriangle} tone="rose" />
        <Metric label="Not run" value={summary.not_run} detail="Awaiting execution" icon={Clock} tone="purple" />
      </div>

      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-heading">
          <div>
            <h3>Execution progress</h3>
            <p>{summary.executed} of {summary.total} test cases executed</p>
          </div>
          <span className="panel-tag">{summary.pass_percentage}% PASS RATE</span>
        </div>

        <div style={{ height: 10, background: '#263149', borderRadius: 20, overflow: 'hidden', margin: '16px 0' }}>
          <div style={{
            width: `${summary.total ? summary.executed / summary.total * 100 : 0}%`,
            height: '100%',
            background: 'linear-gradient(90deg,#34d399,#8b7cff)',
            borderRadius: 20,
            transition: 'width 0.3s'
          }} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13, color: '#aab6cb' }}>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: executionColors.Pass, marginRight: 7 }} />Passed: {summary.passed}</span>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: executionColors.Fail, marginRight: 7 }} />Failed: {summary.failed}</span>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: executionColors.Blocked, marginRight: 7 }} />Blocked: {summary.blocked}</span>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: executionColors['Not Run'], marginRight: 7 }} />Not run: {summary.not_run}</span>
        </div>
      </section>

      <div className="case-layout">
        <form className="panel requirement-panel" onSubmit={generateCases}>
          <div className="panel-heading">
            <div>
              <h3>Requirement input</h3>
              <p>Paste a user story or acceptance criteria</p>
            </div>
            <div className="ai-icon"><Sparkles size={17} /></div>
          </div>

          <label>
            Requirement
            <textarea
              value={requirement}
              onChange={e => setRequirement(e.target.value)}
              rows="9"
              required
              minLength="15"
            />
          </label>

          <div className="hint">
            <ShieldCheck size={15} /> Processed locally. No requirement data is sent to an AI provider.
          </div>

          <button className="primary-btn full-btn" disabled={generating}>
            {generating ? 'Generating scenarios...' : <><Sparkles size={16} /> Generate and save test cases</>}
          </button>
        </form>

        <section className="panel cases-panel">
          <div className="panel-heading">
            <div>
              <h3>Saved test scenarios</h3>
              <p>{cases.length ? `${cases.length} scenarios saved in your database` : 'Your saved scenarios will appear here'}</p>
            </div>
            <span className="panel-tag">TEST EXECUTION</span>
          </div>

          {cases.length
            ? cases.map(c => {
              const draft = executionDrafts[c.id] || {
                status: c.status || 'Not Run',
                actual_result: c.actual_result || '',
                execution_notes: c.execution_notes || ''
              }

              return (
                <article className="test-case" key={c.id}>
                  <div className="case-top">
                    <span className="case-id">{c.case_id || c.id}</span>
                    <Severity value={c.priority} />
                    <span className="category">{c.category}</span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => startEditing(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-btn"
                        disabled={deletingCase === c.id}
                        onClick={() => deleteTestCase(c)}
                        title="Delete test case"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h4>{c.title}</h4>

                  {editingCaseId === c.id && (
                    <div style={{
                      background: '#0d1425',
                      border: '1px solid #6555b9',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16
                    }}>
                      <h4 style={{ marginTop: 0 }}>Edit test case</h4>

                      <label>
                        Test case title
                        <input
                          value={editDraft.title || ''}
                          onChange={e => updateEditDraft('title', e.target.value)}
                          required
                          minLength={3}
                        />
                      </label>

                      <label>
                        Test steps
                        <textarea
                          rows="4"
                          value={editDraft.steps || ''}
                          onChange={e => updateEditDraft('steps', e.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Expected result
                        <textarea
                          rows="3"
                          value={editDraft.expected_result || ''}
                          onChange={e => updateEditDraft('expected_result', e.target.value)}
                          required
                        />
                      </label>

                      <div className="two-fields">
                        <label>
                          Priority
                          <select
                            value={editDraft.priority || 'Medium'}
                            onChange={e => updateEditDraft('priority', e.target.value)}
                          >
                            <option>Critical</option>
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                        </label>

                        <label>
                          Category
                          <select
                            value={editDraft.category || 'Functional'}
                            onChange={e => updateEditDraft('category', e.target.value)}
                          >
                            <option>Functional</option>
                            <option>Validation</option>
                            <option>Authentication</option>
                            <option>Security</option>
                            <option>Performance</option>
                            <option>Usability</option>
                            <option>Compatibility</option>
                            <option>Regression</option>
                            <option>Integration</option>
                          </select>
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={savingCase}
                          onClick={() => saveTestCase(c)}
                        >
                          <Save size={15} />
                          {savingCase ? 'Saving...' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          className="outline-btn"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="case-block">
                    <b>TEST STEPS</b>
                    <p>{c.steps}</p>
                  </div>

                  <div className="case-block">
                    <b>EXPECTED RESULT</b>
                    <p>{c.expected_result}</p>
                  </div>

                  <div style={{ borderTop: '1px solid #29334a', marginTop: 16, paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                      <b style={{ fontSize: 13 }}>TEST EXECUTION</b>
                      <span style={{
                        color: executionColors[draft.status] || '#94a3b8',
                        background: `${executionColors[draft.status] || '#94a3b8'}18`,
                        border: `1px solid ${executionColors[draft.status] || '#94a3b8'}55`,
                        padding: '5px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        {draft.status}
                      </span>
                    </div>

                    <label style={{ display: 'block', fontSize: 12, color: '#aab6cb', marginBottom: 7 }}>
                      Execution status
                    </label>

                    <select
                      value={draft.status}
                      onChange={e => updateDraft(c.id, 'status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: 11,
                        borderRadius: 9,
                        background: '#0d1425',
                        color: '#e2e8f0',
                        border: '1px solid #35415a',
                        marginBottom: 13
                      }}
                    >
                      <option value="Not Run">Not Run</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                      <option value="Blocked">Blocked</option>
                    </select>

                    <label style={{ display: 'block', fontSize: 12, color: '#aab6cb', marginBottom: 7 }}>
                      Actual result
                    </label>

                    <textarea
                      value={draft.actual_result}
                      onChange={e => updateDraft(c.id, 'actual_result', e.target.value)}
                      rows="3"
                      placeholder="Describe what happened when you executed this test..."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: 11,
                        borderRadius: 9,
                        background: '#0d1425',
                        color: '#e2e8f0',
                        border: '1px solid #35415a',
                        marginBottom: 13
                      }}
                    />

                    <label style={{ display: 'block', fontSize: 12, color: '#aab6cb', marginBottom: 7 }}>
                      Execution notes
                    </label>

                    <textarea
                      value={draft.execution_notes}
                      onChange={e => updateDraft(c.id, 'execution_notes', e.target.value)}
                      rows="2"
                      placeholder="Add observations or tester comments..."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: 11,
                        borderRadius: 9,
                        background: '#0d1425',
                        color: '#e2e8f0',
                        border: '1px solid #35415a',
                        marginBottom: 13
                      }}
                    />

                    <button
                      type="button"
                      className="primary-btn"
                      disabled={savingExecution === c.id}
                      onClick={() => saveExecution(c)}
                    >
                      <Save size={15} />
                      {savingExecution === c.id ? 'Saving...' : 'Save execution result'}
                    </button>

                    {c.executed_at && (
                      <p style={{ fontSize: 11, color: '#8491aa', marginTop: 10 }}>
                        Last executed: {new Date(c.executed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </article>
              )
            })
            : <EmptyChart text="Enter a requirement and generate your first test suite." />
          }
        </section>
      </div>
    </>
  )
}


function ReportsPage({ cases, bugs, testSummary, exportPdfReport, exportExcelReport }) {
  const summary = testSummary || {
    total: cases.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    not_run: cases.length,
    executed: 0,
    pass_percentage: 0
  }

  const failedCases = cases.filter(testCase => testCase.status === 'Fail')
  const blockedCases = cases.filter(testCase => testCase.status === 'Blocked')
  const reportStats = [
    { label: 'Total cases', value: summary.total, color: '#8b7cff' },
    { label: 'Passed', value: summary.passed, color: executionColors.Pass },
    { label: 'Failed', value: summary.failed, color: executionColors.Fail },
    { label: 'Blocked', value: summary.blocked, color: executionColors.Blocked },
    { label: 'Not run', value: summary.not_run, color: executionColors['Not Run'] }
  ]

  return (
    <>
      <PageHeading
        eyebrow="QUALITY REPORTING"
        title="QA execution reports"
        subtitle="Review test execution outcomes and export reports from your saved local workspace data."
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            <button className="outline-btn" onClick={exportExcelReport}>
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button className="primary-btn" onClick={exportPdfReport}>
              <Download size={16} /> Export PDF
            </button>
          </div>
        }
      />

      <div className="metric-grid" style={{ marginBottom: 22 }}>
        <Metric label="Total test cases" value={summary.total} detail="Saved test scenarios" icon={ListChecks} tone="blue" />
        <Metric label="Execution rate" value={`${summary.total ? Math.round(summary.executed / summary.total * 100) : 0}%`} detail={`${summary.executed} executed`} icon={Gauge} tone="purple" />
        <Metric label="Pass rate" value={`${summary.pass_percentage}%`} detail="Passed out of executed cases" icon={CheckCircle2} tone="green" />
        <Metric label="Bug reports" value={bugs.length} detail="Recorded defects" icon={Bug} tone="rose" />
      </div>

      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-heading">
          <div>
            <h3>Execution distribution</h3>
            <p>Current status of all saved test cases</p>
          </div>
          <span className="panel-tag">{summary.executed} / {summary.total} EXECUTED</span>
        </div>

        <div style={{ display: 'grid', gap: 17, marginTop: 18 }}>
          {reportStats.map(stat => {
            const percentage = summary.total ? stat.value / summary.total * 100 : 0
            return (
              <div key={stat.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7, color: '#cbd5e1' }}>
                  <span>{stat.label}</span>
                  <b>{stat.value} <span style={{ color: '#8491aa', fontWeight: 400 }}>({percentage.toFixed(1)}%)</span></b>
                </div>
                <div style={{ height: 9, background: '#263149', borderRadius: 20, overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: stat.color, borderRadius: 20 }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="section-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h3>Failed test cases</h3><p>Cases that need investigation</p></div>
            <span className="panel-tag">{failedCases.length} FAILED</span>
          </div>
          {failedCases.length ? failedCases.map(testCase => (
            <div key={testCase.id} style={{ padding: '13px 0', borderBottom: '1px solid #29334a' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="case-id">{testCase.case_id}</span>
                <Severity value={testCase.priority} />
              </div>
              <b style={{ display: 'block', marginTop: 8 }}>{testCase.title}</b>
              <p style={{ color: '#9ca8c0', fontSize: 12, marginBottom: 0 }}>{testCase.actual_result || 'No actual result recorded.'}</p>
            </div>
          )) : <EmptyChart text="No failed test cases. Failed scenarios will appear here." />}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><h3>Blocked test cases</h3><p>Cases waiting on dependencies</p></div>
            <span className="panel-tag">{blockedCases.length} BLOCKED</span>
          </div>
          {blockedCases.length ? blockedCases.map(testCase => (
            <div key={testCase.id} style={{ padding: '13px 0', borderBottom: '1px solid #29334a' }}>
              <span className="case-id">{testCase.case_id}</span>
              <b style={{ display: 'block', marginTop: 8 }}>{testCase.title}</b>
              <p style={{ color: '#9ca8c0', fontSize: 12, marginBottom: 0 }}>{testCase.execution_notes || testCase.actual_result || 'No execution notes recorded.'}</p>
            </div>
          )) : <EmptyChart text="No blocked test cases." />}
        </section>
      </div>

      <section className="panel table-panel" style={{ marginTop: 22 }}>
        <div className="panel-heading">
          <div><h3>Report contents</h3><p>Exports are generated from the latest saved records in your local database.</p></div>
          <span className="panel-tag">LOCAL EXPORT</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <div style={{ background: '#0d1425', borderRadius: 10, padding: 15 }}>
            <FileText size={22} color="#a5b4fc" />
            <b style={{ display: 'block', marginTop: 9 }}>PDF report</b>
            <p style={{ color: '#9ca8c0', fontSize: 12 }}>Execution summary and test case results in a shareable document.</p>
          </div>
          <div style={{ background: '#0d1425', borderRadius: 10, padding: 15 }}>
            <FileSpreadsheet size={22} color="#34d399" />
            <b style={{ display: 'block', marginTop: 9 }}>Excel workbook</b>
            <p style={{ color: '#9ca8c0', fontSize: 12 }}>Separate worksheets for execution summary, test cases and bug reports.</p>
          </div>
        </div>
      </section>
    </>
  )
}

export default App
