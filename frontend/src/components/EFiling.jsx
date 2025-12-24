import { useState, useEffect, useRef } from 'react';
import {
    Send, Inbox, Clock, History, Upload, FileText, User, Download,
    Check, CheckCheck, Search, Filter, X, Paperclip, ChevronDown,
    File, Image, FileSpreadsheet, Presentation, Archive, AlertCircle, Activity,
    ArrowRight, MapPin, GitCommit, CheckCircle2, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { efilingAPI, usersAPI } from '../services/api';
import './EFiling.css';

const EFiling = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('send');
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [inbox, setInbox] = useState([]);
    const [trackedFiles, setTrackedFiles] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [isForwarding, setIsForwarding] = useState(false);
    const [forwardFileId, setForwardFileId] = useState(null);

    const [history, setHistory] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [historyFilter, setHistoryFilter] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);

    // Send form state
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedRecipient, setSelectedRecipient] = useState('');
    const [note, setNote] = useState('');
    const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState('');
    const fileInputRef = useRef(null);

    // Forward state
    const [forwardDropdownOpen, setForwardDropdownOpen] = useState(null);
    const [forwardRecipient, setForwardRecipient] = useState('');
    const [forwardSearch, setForwardSearch] = useState('');

    useEffect(() => {
        fetchEmployees();
        fetchUnreadCount();
    }, []);

    useEffect(() => {
        if (activeTab === 'inbox') fetchInbox();
        else if (activeTab === 'track') fetchTrackedFiles();
        else if (activeTab === 'history') fetchHistory();
    }, [activeTab, historyFilter]);

    const fetchEmployees = async () => {
        try {
            const data = await usersAPI.getForPeerRating();
            if (data.success) {
                const others = data.users.filter(emp =>
                    emp._id !== user?.id && emp.username !== user?.username
                );
                setEmployees(others);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const data = await efilingAPI.getUnreadCount();
            if (data.success) setUnreadCount(data.count);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    const fetchInbox = async () => {
        setLoading(true);
        try {
            const data = await efilingAPI.getInbox();
            if (data.success) {
                setInbox(data.transfers);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch inbox:', error);
        } finally {
            setLoading(false);
        }
    };



    const fetchTrackedFiles = async () => {
        setLoading(true);
        try {
            const data = await efilingAPI.getSent();
            if (data.success) setTrackedFiles(data.transfers);
        } catch (error) {
            console.error('Failed to fetch tracked files:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await efilingAPI.getHistory(1, historyFilter);
            if (data.success) setHistory(data.transfers);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                alert('File size must be less than 25MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSend = async () => {
        if (!selectedFile) return alert('Please select a file');
        if (!selectedRecipient) return alert('Please select a recipient');

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('recipientId', selectedRecipient);
            formData.append('note', note);

            const data = await efilingAPI.sendFile(formData);
            if (data.success) {
                alert('File sent successfully!');
                setSelectedFile(null);
                setSelectedRecipient('');
                setNote('');
                setRecipientSearch('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                alert(data.message || 'Failed to send file');
            }
        } catch (error) {
            alert('Failed to send file');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (transfer) => {
        try {
            if (!transfer.isRead && transfer.recipient?._id === user?.id) {
                await efilingAPI.markAsRead(transfer._id);
                fetchInbox();
            }

            const response = await efilingAPI.downloadFile(transfer._id);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = transfer.originalName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                alert('Failed to download file');
            }
        } catch (error) {
            alert('Failed to download file');
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await efilingAPI.markAsRead(id);
            fetchInbox();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const getEmployeeName = (emp) => {
        if (emp?.profile?.firstName) return `${emp.profile.firstName} ${emp.profile.lastName || ''}`;
        return emp?.username || 'Unknown';
    };

    const getFileIcon = (fileType) => {
        if (fileType?.includes('image')) return <Image size={20} className="file-icon image" />;
        if (fileType?.includes('pdf')) return <FileText size={20} className="file-icon pdf" />;
        if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return <FileSpreadsheet size={20} className="file-icon excel" />;
        if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return <Presentation size={20} className="file-icon ppt" />;
        if (fileType?.includes('zip') || fileType?.includes('rar')) return <Archive size={20} className="file-icon archive" />;
        return <File size={20} className="file-icon default" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const filteredEmployees = employees.filter(emp =>
        getEmployeeName(emp).toLowerCase().includes(recipientSearch.toLowerCase())
    );

    const getSelectedRecipientName = () => {
        const emp = employees.find(e => e._id === selectedRecipient);
        return emp ? getEmployeeName(emp) : '';
    };

    const renderSendTab = () => (
        <div className="send-section">
            <div className="send-form">
                <h3>Send Document</h3>

                <div className="form-group">
                    <label>Select Recipient</label>
                    <div className="recipient-selector">
                        <div className="recipient-input" onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}>
                            <User size={18} />
                            <span className={selectedRecipient ? 'selected' : 'placeholder'}>
                                {selectedRecipient ? getSelectedRecipientName() : 'Choose recipient...'}
                            </span>
                            <ChevronDown size={18} />
                        </div>
                        {showRecipientDropdown && (
                            <div className="recipient-dropdown">
                                <div className="dropdown-search">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search employees..."
                                        value={recipientSearch}
                                        onChange={(e) => setRecipientSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="dropdown-list">
                                    {filteredEmployees.length === 0 ? (
                                        <div className="no-results">No employees found</div>
                                    ) : (
                                        filteredEmployees.map(emp => (
                                            <div
                                                key={emp._id}
                                                className={`dropdown-item ${selectedRecipient === emp._id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedRecipient(emp._id);
                                                    setShowRecipientDropdown(false);
                                                    setRecipientSearch('');
                                                }}
                                            >
                                                <div className="emp-avatar">{getEmployeeName(emp).charAt(0)}</div>
                                                <div className="emp-details">
                                                    <span className="emp-name">{getEmployeeName(emp)}</span>
                                                    <span className="emp-role">{emp.employment?.designation || emp.role}</span>
                                                </div>
                                                {selectedRecipient === emp._id && <Check size={16} />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>Select File</label>
                    <div
                        className={`file-upload-area ${selectedFile ? 'has-file' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
                        {selectedFile ? (
                            <div className="selected-file">
                                {getFileIcon(selectedFile.type)}
                                <div className="file-info">
                                    <span className="file-name">{selectedFile.name}</span>
                                    <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                                </div>
                                <button className="remove-file" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="upload-placeholder">
                                <Upload size={32} />
                                <span>Click to select file</span>
                                <span className="file-types">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, Images, ZIP (Max 25MB)</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>Note (Optional)</label>
                    <textarea placeholder="Add a message or note..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                </div>

                <button className="send-btn" onClick={handleSend} disabled={loading || !selectedFile || !selectedRecipient}>
                    {loading ? <span>Sending...</span> : <><Send size={18} /> Send Document</>}
                </button>
            </div>
        </div>
    );

    const renderInboxTab = () => (
        <div className="inbox-section">
            {loading ? <div className="loading">Loading...</div> : inbox.length === 0 ? (
                <div className="empty-state">
                    <Inbox size={48} />
                    <h3>No files received</h3>
                    <p>Files sent to you will appear here</p>
                </div>
            ) : (
                <div className="file-list">
                    {inbox.map(transfer => (
                        <div key={transfer._id} className={`file-item ${!transfer.isRead ? 'unread' : ''}`}>
                            <div className="file-icon-wrapper">
                                {getFileIcon(transfer.fileType)}
                                {!transfer.isRead && <span className="unread-dot"></span>}
                            </div>
                            <div className="file-details">
                                <div className="file-header">
                                    <span className="file-name">{transfer.originalName}</span>
                                    <span className="file-size">{formatFileSize(transfer.fileSize)}</span>
                                </div>
                                <div className="file-meta">
                                    <span className="sender"><User size={14} /> From: {getEmployeeName(transfer.sender)}</span>
                                    <span className="date"><Clock size={14} /> {formatDateTime(transfer.createdAt)}</span>
                                </div>
                                {transfer.note && <div className="file-note"><Paperclip size={14} /> {transfer.note}</div>}
                            </div>
                            <div className="file-actions">
                                <button className="download-btn" onClick={() => handleDownload(transfer)} title="Download"><Download size={18} /></button>
                                {!transfer.isRead && (
                                    <button className="mark-read-btn" onClick={() => handleMarkAsRead(transfer._id)} title="Mark as read">
                                        <Check size={18} />
                                    </button>
                                )}
                                <div className="forward-wrapper">
                                    <button 
                                        className="forward-btn" 
                                        onClick={() => setForwardDropdownOpen(forwardDropdownOpen === transfer._id ? null : transfer._id)}
                                        title="Forward"
                                    >
                                        <Send size={18} />
                                    </button>
                                    {forwardDropdownOpen === transfer._id && (
                                        <div className="forward-dropdown">
                                            <div className="dropdown-header">
                                                <h4>Forward to:</h4>
                                                <button onClick={() => setForwardDropdownOpen(null)} className="close-btn">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="dropdown-search">
                                                <Search size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search employees..."
                                                    value={forwardSearch}
                                                    onChange={(e) => setForwardSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="dropdown-list">
                                                {employees.filter(emp => 
                                                    getEmployeeName(emp).toLowerCase().includes(forwardSearch.toLowerCase())
                                                ).map(emp => (
                                                    <div
                                                        key={emp._id}
                                                        className="dropdown-item"
                                                        onClick={() => handleForwardFile(transfer._id, emp._id)}
                                                    >
                                                        <User size={16} />
                                                        <div className="emp-info">
                                                            <span className="emp-name">{getEmployeeName(emp)}</span>
                                                            {emp.employment?.designation && (
                                                                <span className="emp-designation">{emp.employment.designation}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );



    const handleForwardFile = async (fileId, recipientId) => {
        if (!fileId || !recipientId) return;

        setLoading(true);
        try {
            const response = await efilingAPI.forwardFile({
                originalTransferId: fileId,
                recipientId: recipientId,
                note: '' // Can add note field later if needed
            });
            
            if (response.success) {
                alert('File forwarded successfully!');
                setForwardDropdownOpen(null);
                setForwardSearch('');
                fetchInbox();
                fetchUnreadCount();
            } else {
                alert(response.message || 'Failed to forward file');
            }
        } catch (error) {
            console.error('Failed to forward file:', error);
            alert('Failed to forward file');
        } finally {
            setLoading(false);
        }
    };

    const handleForward = async () => {
        if (!forwardFileId || !selectedRecipient) return;

        setLoading(true);
        try {
            await efilingAPI.forwardFile({
                originalTransferId: forwardFileId,
                recipientId: selectedRecipient,
                note
            });
            alert('File forwarded successfully!');
            setIsForwarding(false);
            setForwardFileId(null);
            setSelectedRecipient('');
            setNote('');
            if (activeTab === 'inbox') fetchInbox();
            if (activeTab === 'track') fetchTrackedFiles();
            // If viewing a thread, refresh it
            if (selectedThread) {
                const threadData = await efilingAPI.getFileThread(selectedThread[0]._id);
                if (threadData.success) setSelectedThread(threadData.thread);
            }
        } catch (error) {
            alert('Failed to forward file');
        } finally {
            setLoading(false);
        }
    };

    const viewThread = async (fileId, e) => {
        if (e) e.stopPropagation();
        setLoading(true);
        try {
            const data = await efilingAPI.getFileThread(fileId);
            if (data.success) {
                setSelectedThread(data.thread);
            } else {
                alert('Failed to load file journey');
            }
        } catch (error) {
            console.error('Failed to fetch thread:', error);
            alert('Error loading file journey');
        } finally {
            setLoading(false);
        }
    };

    const renderFileJourney = () => {
        if (!selectedThread) return null;

        // Build the journey path - show unique users in order
        const journeyPath = [];
        selectedThread.forEach((step, index) => {
            // Add sender for first step
            if (index === 0) {
                journeyPath.push({
                    user: step.sender,
                    status: 'sent',
                    timestamp: step.createdAt,
                    step: step,
                    note: step.note
                });
            }
            // Add recipient
            journeyPath.push({
                user: step.recipient,
                status: step.isRead ? 'read' : 'delivered',
                timestamp: step.createdAt,
                step: step,
                note: step.note,
                isCurrentHolder: index === selectedThread.length - 1
            });
        });

        return (
            <div className="journey-view">
                <div className="journey-header">
                    <button className="back-btn" onClick={() => setSelectedThread(null)} type="button">
                        <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /> Back to List
                    </button>
                    <div className="file-info">
                        <div className="file-icon-large">{getFileIcon(selectedThread[0]?.fileType)}</div>
                        <div>
                            <h3>{selectedThread[0]?.originalName}</h3>
                            <p>{formatFileSize(selectedThread[0]?.fileSize)} • {formatDateTime(selectedThread[0]?.createdAt)}</p>
                        </div>
                    </div>
                </div>

                <div className="timeline-container">
                    {(() => {
                        // Split journey path into rows of 5
                        const rows = [];
                        const itemsPerRow = 5;
                        
                        for (let i = 0; i < journeyPath.length; i += itemsPerRow) {
                            rows.push(journeyPath.slice(i, i + itemsPerRow));
                        }
                        
                        return rows.map((row, rowIndex) => {
                            // Odd rows (1,3,5...) go right-to-left, even rows (0,2,4...) go left-to-right
                            const isReversed = rowIndex % 2 === 1;
                            const isLastRow = rowIndex === rows.length - 1;
                            
                            // For reversed rows, reverse the array so DOM order matches visual order
                            const displayRow = isReversed ? [...row].reverse() : row;
                            
                            return (
                                <div key={rowIndex} className={`timeline-row ${isReversed ? 'reversed' : 'normal'}`}>
                                    {displayRow.map((node, displayIndex) => {
                                        // Calculate original data index
                                        const dataIndex = isReversed ? row.length - 1 - displayIndex : displayIndex;
                                        const originalIndex = rowIndex * itemsPerRow + dataIndex;
                                        
                                        // Determine if this step needs connectors
                                        const isLastInDisplay = displayIndex === displayRow.length - 1;
                                        
                                        // Horizontal connector: all except last in display order
                                        const hasHorizontalConnector = !isLastInDisplay;
                                        
                                        // Vertical connector: last item in display (rightmost) drops down to next row
                                        const hasVerticalConnector = !isLastRow && isLastInDisplay;
                                        
                                        const userName = node.user?.profile?.firstName
                                            ? `${node.user.profile.firstName} ${node.user.profile.lastName || ''}`
                                            : node.user?.username || 'Unknown';
                                        
                                        return (
                                            <div 
                                                key={`${node.user?._id}-${originalIndex}`} 
                                                className={`timeline-step ${node.isCurrentHolder ? 'current-holder' : ''} ${hasHorizontalConnector ? 'has-horizontal' : ''} ${hasVerticalConnector ? 'has-vertical' : ''}`}
                                                onClick={() => setSelectedNode(node)}
                                            >
                                                <div className="step-icon">
                                                    <MapPin size={32} />
                                                </div>
                                                <div className="step-content">
                                                    <div className="step-name">{userName}</div>
                                                    <div className="step-status">
                                                        {node.status === 'sent' && 'Sent'}
                                                        {node.status === 'delivered' && 'Delivered'}
                                                        {node.status === 'read' && 'Read / Approved'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Detail Modal */}
                {selectedNode && (
                    <div className="detail-modal-overlay" onClick={() => setSelectedNode(null)}>
                        <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setSelectedNode(null)}>
                                <X size={20} />
                            </button>
                            
                            <div className="modal-header-section">
                                <div className="user-avatar-large">
                                    {selectedNode.user?.profile?.firstName
                                        ? `${selectedNode.user.profile.firstName[0]}${selectedNode.user.profile.lastName?.[0] || ''}`
                                        : (selectedNode.user?.username?.[0] || 'U')}
                                </div>
                                <div>
                                    <h3>
                                        {selectedNode.user?.profile?.firstName
                                            ? `${selectedNode.user.profile.firstName} ${selectedNode.user.profile.lastName || ''}`
                                            : selectedNode.user?.username || 'Unknown'}
                                    </h3>
                                    <p>{selectedNode.user?.employment?.designation || 'Employee'}</p>
                                </div>
                            </div>

                            <div className="modal-detail-row">
                                <span className="detail-label">Status:</span>
                                <div className={`status-badge-large status-${selectedNode.status}`}>
                                    {selectedNode.status === 'sent' && <><Send size={14} /> Sent</>}
                                    {selectedNode.status === 'delivered' && <><CheckCircle2 size={14} /> Delivered</>}
                                    {selectedNode.status === 'read' && <><Eye size={14} /> Read/Approved</>}
                                </div>
                            </div>

                            <div className="modal-detail-row">
                                <span className="detail-label">Time:</span>
                                <span className="detail-value">
                                    <Clock size={14} /> {formatDateTime(selectedNode.timestamp)}
                                </span>
                            </div>

                            {selectedNode.user?.email && (
                                <div className="modal-detail-row">
                                    <span className="detail-label">Email:</span>
                                    <span className="detail-value">{selectedNode.user.email}</span>
                                </div>
                            )}

                            {selectedNode.note && (
                                <div className="modal-detail-row">
                                    <span className="detail-label">Note:</span>
                                    <div className="detail-note">
                                        <Paperclip size={14} />
                                        <span>{selectedNode.note}</span>
                                    </div>
                                </div>
                            )}

                            {selectedNode.isCurrentHolder && (
                                <div className="modal-detail-row">
                                    <span className="detail-label">Current Holder:</span>
                                    <span className="detail-value current-badge">
                                        <MapPin size={14} /> Yes
                                    </span>
                                </div>
                            )}

                            <div className="modal-actions-section">
                                {selectedNode.user?._id === user?.id && selectedNode.step && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                handleDownload(selectedNode.step);
                                                setSelectedNode(null);
                                            }} 
                                            className="modal-action-btn download"
                                        >
                                            <Download size={16} /> Download File
                                        </button>
                                        {selectedNode.isCurrentHolder && (
                                            <button 
                                                onClick={() => {
                                                    setForwardFileId(selectedNode.step._id);
                                                    setIsForwarding(true);
                                                    setSelectedNode(null);
                                                }} 
                                                className="modal-action-btn forward"
                                            >
                                                <Send size={16} /> Forward File
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTrackTab = () => (
        <div className="track-section">
            {selectedThread ? renderFileJourney() : (
                <>
                    {loading ? <div className="loading">Loading...</div> : trackedFiles.length === 0 ? (
                        <div className="empty-state">
                            <Activity size={48} />
                            <h3>No files tracked</h3>
                            <p>Files you participate in will appear here</p>
                        </div>
                    ) : (
                        <div className="file-list">
                            {trackedFiles.map(transfer => (
                                <div key={transfer._id} className="file-item" onClick={(e) => viewThread(transfer._id, e)}>
                                    <div className="file-icon-wrapper">{getFileIcon(transfer.fileType)}</div>
                                    <div className="file-details">
                                        <div className="file-header">
                                            <span className="file-name">{transfer.originalName}</span>
                                            <span className="file-size">{formatFileSize(transfer.fileSize)}</span>
                                        </div>
                                        <div className="file-meta">
                                            <span><User size={14} /> From: {getEmployeeName(transfer.sender)}</span>
                                            <span>To: {getEmployeeName(transfer.recipient)}</span>
                                            <span className="date"><Clock size={14} /> {formatDateTime(transfer.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="file-actions">
                                        <button
                                            className="view-btn"
                                            onClick={(e) => viewThread(transfer._id, e)}
                                            type="button"
                                        >
                                            View Journey <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {isForwarding && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Forward File</h3>
                        <div className="form-group">
                            <label>Select Recipient</label>
                            <div className="recipient-selector">
                                <div className="recipient-input" onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}>
                                    <User size={18} />
                                    <span className={selectedRecipient ? 'selected' : 'placeholder'}>
                                        {selectedRecipient ? getSelectedRecipientName() : 'Choose recipient...'}
                                    </span>
                                    <ChevronDown size={18} />
                                </div>
                                {showRecipientDropdown && (
                                    <div className="recipient-dropdown">
                                        <div className="dropdown-search">
                                            <Search size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={recipientSearch}
                                                onChange={(e) => setRecipientSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="dropdown-list">
                                            {filteredEmployees.map(emp => (
                                                <div
                                                    key={emp._id}
                                                    className={`dropdown-item ${selectedRecipient === emp._id ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedRecipient(emp._id);
                                                        setShowRecipientDropdown(false);
                                                    }}
                                                >
                                                    <div className="emp-avatar">{getEmployeeName(emp).charAt(0)}</div>
                                                    <span className="emp-name">{getEmployeeName(emp)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Note</label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note..." />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => { setIsForwarding(false); setForwardFileId(null); }}>Cancel</button>
                            <button className="confirm-btn" onClick={handleForward} disabled={loading || !selectedRecipient}>Forward</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderHistoryTab = () => (
        <div className="history-section">
            <div className="history-filters">
                <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}>
                    <option value="">All Transfers</option>
                    <option value="sent">Sent Only</option>
                    <option value="received">Received Only</option>
                </select>
            </div>

            {loading ? <div className="loading">Loading...</div> : history.length === 0 ? (
                <div className="empty-state">
                    <History size={48} />
                    <h3>No history</h3>
                    <p>Your file transfer history will appear here</p>
                </div>
            ) : (
                <div className="file-list history-list">
                    {history.map(transfer => {
                        const isSent = transfer.sender?._id === user?.id || transfer.sender?.username === user?.username;
                        return (
                            <div key={transfer._id} className={`file-item ${isSent ? 'sent' : 'received'}`}>
                                <div className="transfer-direction">
                                    <span className={`direction-badge ${isSent ? 'sent' : 'received'}`}>{isSent ? 'SENT' : 'RECEIVED'}</span>
                                </div>
                                <div className="file-icon-wrapper">{getFileIcon(transfer.fileType)}</div>
                                <div className="file-details">
                                    <div className="file-header">
                                        <span className="file-name">{transfer.originalName}</span>
                                        <span className="file-size">{formatFileSize(transfer.fileSize)}</span>
                                    </div>
                                    <div className="file-meta">
                                        <span className="person"><User size={14} /> {isSent ? `To: ${getEmployeeName(transfer.recipient)}` : `From: ${getEmployeeName(transfer.sender)}`}</span>
                                        <span className="date"><Clock size={14} /> {formatDateTime(transfer.createdAt)}</span>
                                    </div>
                                    {transfer.note && <div className="file-note"><Paperclip size={14} /> {transfer.note}</div>}
                                </div>
                                <div className="file-actions">
                                    <button className="download-btn" onClick={() => handleDownload(transfer)} title="Download"><Download size={18} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <div className="efiling-container">
            <div className="efiling-header">
                <h2>E-Filing</h2>
                <p>Send and receive documents securely</p>
            </div>

            <div className="efiling-tabs">
                <button className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`} onClick={() => setActiveTab('send')}>
                    <Send size={18} /> Send
                </button>
                <button className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
                    <Inbox size={18} /> Inbox
                    {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                <button className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`} onClick={() => setActiveTab('track')}>
                    <Activity size={18} /> Track File
                </button>

                <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    <History size={18} /> History
                </button>
            </div>

            <div className="efiling-content">
                {activeTab === 'send' && renderSendTab()}
                {activeTab === 'inbox' && renderInboxTab()}
                {activeTab === 'track' && renderTrackTab()}

                {activeTab === 'history' && renderHistoryTab()}
            </div>
        </div>
    );
};

export default EFiling;
