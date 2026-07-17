import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiTrash2, FiRefreshCw, FiBookOpen, FiDownload,
  FiEye, FiSliders, FiArrowLeft, FiGrid, FiActivity, FiX, FiCheck
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(8);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Compare state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareSessionA, setCompareSessionA] = useState(null);
  const [compareSessionBId, setCompareSessionBId] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [page, sortBy, sortOrder, difficulty, interviewType, status]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        search: search.trim() || undefined,
        role: role.trim() || undefined,
        company: company.trim() || undefined,
        difficulty: difficulty || undefined,
        interviewType: interviewType || undefined,
        status: status || undefined,
        minScore: minScore || undefined,
        maxScore: maxScore || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const response = await axiosInstance.get('/dashboard/history', { params });
      if (response.data && response.data.success) {
        setHistory(response.data.history || []);
        setTotal(response.data.total || 0);
        setPages(response.data.pages || 1);
      }
    } catch (error) {
      console.error('Error loading interview history:', error);
      toast.error('Failed to load interview history logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRole('');
    setCompany('');
    setDifficulty('');
    setInterviewType('');
    setStatus('');
    setMinScore('');
    setMaxScore('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setTimeout(fetchHistory, 50);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this interview and all its evaluations?')) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/interviews/${id}`);
      if (response.data.success) {
        toast.success('Interview deleted successfully');
        fetchHistory();
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
      toast.error('Failed to delete mock interview.');
    }
  };

  const handleRetake = async (id) => {
    if (!window.confirm('Do you want to launch a retake of this interview with the same parameters?')) {
      return;
    }

    try {
      const response = await axiosInstance.post(`/interviews/${id}/retake`);
      if (response.data.success) {
        toast.success('Retake session initialized');
        navigate(`/interview/${response.data.session.interviewId}/questions`);
      }
    } catch (error) {
      console.error('Error retaking interview:', error);
      toast.error('Failed to start retake session.');
    }
  };

  const handleOpenCompare = (session) => {
    setCompareSessionA(session);
    setCompareSessionBId('');
    setComparisonResult(null);
    setShowCompareModal(true);
  };

  const handleCompareSubmit = async () => {
    if (!compareSessionBId) {
      toast.warning('Please select another interview to compare with.');
      return;
    }
    setCompareLoading(true);
    try {
      const response = await axiosInstance.get(`/dashboard/compare/${compareSessionA.interviewId}`, {
        params: { compareWith: compareSessionBId }
      });
      if (response.data.success) {
        setComparisonResult(response.data);
      }
    } catch (error) {
      console.error('Comparison error:', error);
      toast.error('Failed to compare reports.');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleDownloadPdf = (interviewId) => {
    // Navigate to full HTML print endpoint
    window.open(`http://localhost:5000/api/interviews/${interviewId}/report/pdf`, '_blank');
  };

  return (
    <div className="container py-4 text-start">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Interview History & Logs</h2>
          <p className="text-muted small mb-0">Search, filter, delete, compare, and manage your historical mock interview sessions.</p>
        </div>
        <Link to="/performance" className="btn btn-outline-primary d-flex align-items-center gap-1.5 py-2 px-3 border bg-transparent text-primary">
          <FiArrowLeft /> Back to Performance
        </Link>
      </div>

      {/* Filter Options Section */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <form onSubmit={handleApplyFilters} className="row g-3">
          <div className="col-md-3">
            <label className="form-label small fw-semibold text-muted">Role or Keyword</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0"><FiSearch /></span>
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="form-control border-start-0" 
                placeholder="Search SDE, Frontend..." 
              />
            </div>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold text-muted">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="form-select form-select-sm">
              <option value="">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold text-muted">Type</label>
            <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)} className="form-select form-select-sm">
              <option value="">All</option>
              <option value="Technical">Technical</option>
              <option value="HR">HR</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-semibold text-muted">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select form-select-sm">
              <option value="">All</option>
              <option value="Completed">Graded</option>
              <option value="InProgress">In Progress</option>
              <option value="AwaitingEvaluation">Evaluating</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end gap-2">
            <button type="submit" className="btn btn-sm btn-primary-purple py-2 px-3 flex-grow-1 text-white">
              Apply Filters
            </button>
            <button type="button" onClick={handleResetFilters} className="btn btn-sm btn-outline-secondary py-2 px-3 border bg-transparent text-secondary">
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Main Table List */}
      <div className="glass-panel p-4 bg-white border shadow-sm">
        {loading ? (
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: '0.86rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Interview</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Difficulty</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td>
                      <div className="skeleton-pulse mb-1" style={{ width: '120px', height: '16px' }} />
                      <div className="skeleton-pulse" style={{ width: '80px', height: '12px' }} />
                    </td>
                    <td><div className="skeleton-pulse" style={{ width: '90px', height: '16px' }} /></td>
                    <td><div className="skeleton-pulse" style={{ width: '80px', height: '16px' }} /></td>
                    <td><div className="skeleton-pulse" style={{ width: '60px', height: '20px' }} /></td>
                    <td><div className="skeleton-pulse" style={{ width: '70px', height: '16px' }} /></td>
                    <td><div className="skeleton-pulse" style={{ width: '40px', height: '16px' }} /></td>
                    <td><div className="skeleton-pulse" style={{ width: '75px', height: '20px' }} /></td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1.5">
                        <div className="skeleton-pulse rounded-circle" style={{ width: '28px', height: '28px' }} />
                        <div className="skeleton-pulse rounded-circle" style={{ width: '28px', height: '28px' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : history.length === 0 ? (
          <div className="py-5 text-center text-muted">
            <FiBookOpen className="display-4 mb-3 opacity-25" />
            <p className="small mb-0">No mock interview history logs match your filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Interview</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Difficulty</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="fw-semibold text-dark d-block">{item.title}</span>
                      <span className="text-muted small" style={{ fontSize: '0.72rem' }}>{item.interviewId}</span>
                    </td>
                    <td>{item.role}</td>
                    <td>{item.company || 'N/A'}</td>
                    <td>
                      <span className={`badge bg-${item.difficulty === 'Easy' ? 'success' : item.difficulty === 'Medium' ? 'warning text-dark' : 'danger'} bg-opacity-10 text-${item.difficulty === 'Easy' ? 'success' : item.difficulty === 'Medium' ? 'warning' : 'danger'} fw-bold`}>
                        {item.difficulty}
                      </span>
                    </td>
                    <td>{new Date(item.completedAt).toLocaleDateString()}</td>
                    <td>
                      {item.overallScore !== null ? (
                        <strong className="text-primary fw-bold">{item.overallScore}%</strong>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-2.5 py-1 ${item.status === 'Completed' ? 'bg-success text-success bg-opacity-10' : item.status === 'InProgress' ? 'bg-primary text-primary bg-opacity-10' : 'bg-info text-info bg-opacity-10'}`}>
                        {item.status === 'Completed' ? 'Graded' : item.status === 'InProgress' ? 'In Progress' : 'Evaluating'}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1.5">
                        {item.status === 'Completed' && (
                          <>
                            <button
                              onClick={() => navigate(`/interview/${item.interviewId}/report`)}
                              className="btn btn-sm btn-light p-1.5 rounded-circle border"
                              title="View Performance Report"
                            >
                              <FiEye />
                            </button>
                            <button
                              onClick={() => handleOpenCompare(item)}
                              className="btn btn-sm btn-light p-1.5 rounded-circle border text-info"
                              title="Compare Report"
                            >
                              <FiActivity />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(item.interviewId)}
                              className="btn btn-sm btn-light p-1.5 rounded-circle border text-success"
                              title="Download Report PDF"
                            >
                              <FiDownload />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleRetake(item.interviewId)}
                          className="btn btn-sm btn-light p-1.5 rounded-circle border text-warning"
                          title="Retake Interview"
                        >
                          <FiRefreshCw />
                        </button>
                        <button
                          onClick={() => handleDelete(item.interviewId)}
                          className="btn btn-sm btn-light p-1.5 rounded-circle border text-danger"
                          title="Delete Interview"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
            <span className="text-muted small">Total: <strong>{total}</strong> interviews logs</span>
            <div className="d-flex gap-1.5">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(prev => prev - 1)}
                className="btn btn-sm btn-outline-secondary border bg-transparent"
              >
                Previous
              </button>
              <button 
                disabled={page === pages} 
                onClick={() => setPage(prev => prev + 1)}
                className="btn btn-sm btn-outline-secondary border bg-transparent"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark">Compare Interview Reports</h5>
                <button type="button" onClick={() => setShowCompareModal(false)} className="btn-close shadow-none border-0 bg-transparent"><FiX /></button>
              </div>
              <div className="modal-body py-4 text-start">
                <div className="mb-4">
                  <span className="text-muted small d-block mb-1">Target Report (Interview A)</span>
                  <strong className="text-dark">{compareSessionA?.title} ({compareSessionA?.interviewId}) &bull; {compareSessionA?.role}</strong>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-muted">Select Interview B to Compare With</label>
                  <select 
                    value={compareSessionBId} 
                    onChange={(e) => setCompareSessionBId(e.target.value)} 
                    className="form-select form-select-sm"
                  >
                    <option value="">-- Choose Completed Interview --</option>
                    {history
                      .filter(h => h.status === 'Completed' && h.interviewId !== compareSessionA?.interviewId)
                      .map((h, i) => (
                        <option key={i} value={h.interviewId}>
                          {h.title} ({h.interviewId}) - {h.overallScore}% Score
                        </option>
                      ))}
                  </select>
                </div>

                <button 
                  onClick={handleCompareSubmit} 
                  disabled={compareLoading}
                  className="btn btn-sm btn-primary-purple text-white px-4 py-2 w-100 mb-4"
                >
                  {compareLoading ? 'Generating comparison details...' : 'Generate Comparison Report'}
                </button>

                {comparisonResult && (
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="table-responsive">
                        <table className="table table-bordered text-center align-middle" style={{ fontSize: '0.84rem' }}>
                          <thead className="table-light">
                            <tr>
                              <th>Metric</th>
                              <th className="text-primary">{comparisonResult.reportA.title} (A)</th>
                              <th className="text-success">{comparisonResult.reportB.title} (B)</th>
                              <th>Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'Overall Average Score', valA: comparisonResult.reportA.overallScore, valB: comparisonResult.reportB.overallScore, unit: '%' },
                              { label: 'Technical Core', valA: comparisonResult.reportA.technical, valB: comparisonResult.reportB.technical, unit: '%' },
                              { label: 'HR / Behavioral', valA: comparisonResult.reportA.hr, valB: comparisonResult.reportB.hr, unit: '%' },
                              { label: 'Confidence Metrics', valA: comparisonResult.reportA.confidence, valB: comparisonResult.reportB.confidence, unit: '%' },
                              { label: 'Communication Speed', valA: comparisonResult.reportA.communication, valB: comparisonResult.reportB.communication, unit: '%' },
                              { label: 'Completion Rate', valA: comparisonResult.reportA.completionRate, valB: comparisonResult.reportB.completionRate, unit: '%' },
                              { label: 'Duration Practiced', valA: Math.round(comparisonResult.reportA.totalTime / 60), valB: Math.round(comparisonResult.reportB.totalTime / 60), unit: ' mins' }
                            ].map((row, idx) => {
                              const diff = row.valB - row.valA;
                              return (
                                <tr key={idx}>
                                  <td className="fw-semibold text-start">{row.label}</td>
                                  <td>{row.valA}{row.unit}</td>
                                  <td>{row.valB}{row.unit}</td>
                                  <td className={diff > 0 ? 'text-success fw-bold' : diff < 0 ? 'text-danger fw-bold' : 'text-muted'}>
                                    {diff > 0 ? `+${diff}` : diff}{row.unit}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewHistory;
