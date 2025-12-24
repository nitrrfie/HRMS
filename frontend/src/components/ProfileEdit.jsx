import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Save, Upload, FileText, Trash2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, getPhotoUrl } from '../services/api';
import './ProfileEdit.css';

const ProfileEdit = ({ onBack }) => {
    const { user, login } = useAuth();
    const fileInputRef = useRef(null);
    const photoInputRef = useRef(null);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        phone: '',
        designation: user?.role || '',
        department: 'Executive',
        dateOfBirth: '',
        dateOfJoining: '2025-07-16',
        address: ''
    });
    const [documents, setDocuments] = useState([]);
    const [profilePhoto, setProfilePhoto] = useState(user?.profile?.photo || null);
    const [photoPreview, setPhotoPreview] = useState(
        user?.profile?.photo ? getPhotoUrl(user.profile.photo) : null
    );
    const [uploading, setUploading] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newDocs = files.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: (file.size / 1024).toFixed(2) + ' KB',
            type: file.type,
            uploadedAt: new Date().toLocaleDateString('en-IN')
        }));
        setDocuments(prev => [...prev, ...newDocs]);
    };

    const handleDeleteDoc = (id) => {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to server
        setUploading(true);
        try {
            const result = await usersAPI.uploadProfilePhoto(user._id || user.id, file);
            if (result.success) {
                setProfilePhoto(result.photoPath);
                alert('Profile photo uploaded successfully!');
                // Update user in context
                login({ 
                    ...user, 
                    profile: { 
                        ...user.profile, 
                        photo: result.photoPath 
                    } 
                });
            } else {
                alert('Failed to upload photo: ' + result.message);
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error uploading photo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        login({ ...user, username: formData.username, email: formData.email });
        onBack();
    };

    return (
        <div className="profile-edit-container">
            <div className="profile-edit-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>
                <h2>Edit Profile</h2>
            </div>

            <div className="profile-edit-content">
                <div className="profile-avatar-section">
                    <div className="profile-avatar-large">
                        {photoPreview ? (
                            <img 
                                src={photoPreview} 
                                alt="Profile" 
                                style={{ 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                }} 
                            />
                        ) : (
                            formData.username ? formData.username.substring(0, 2).toUpperCase() : 'US'
                        )}
                    </div>
                    <button 
                        type="button"
                        className="change-avatar-btn" 
                        onClick={() => photoInputRef.current.click()}
                        disabled={uploading}
                    >
                        <Camera size={16} />
                        <span>{uploading ? 'Uploading...' : 'Change Photo'}</span>
                    </button>
                    <input
                        type="file"
                        ref={photoInputRef}
                        onChange={handlePhotoChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Designation</label>
                            <input
                                type="text"
                                name="designation"
                                value={formData.designation == "ACCOUNTANT" ? formData.designation + " cum Administrator" : formData.designation}
                                onChange={handleChange}
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Date of Joining</label>
                            <input
                                type="date"
                                name="dateOfJoining"
                                value={formData.dateOfJoining}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Enter your address"
                            />
                        </div>
                    </div>

                    <div className="documents-section">
                        <div className="documents-header">
                            <h3>My Documents</h3>
                            <button type="button" className="upload-btn" onClick={() => fileInputRef.current.click()}>
                                <Upload size={16} />
                                <span>Upload Document</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                multiple
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className="documents-list">
                            {documents.length === 0 ? (
                                <div className="no-documents">
                                    <FileText size={40} />
                                    <p>No documents uploaded yet</p>
                                    <span>Upload your documents like ID proof, certificates, etc.</span>
                                </div>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="document-item">
                                        <FileText size={20} />
                                        <div className="doc-info">
                                            <span className="doc-name">{doc.name}</span>
                                            <span className="doc-meta">{doc.size} | {doc.uploadedAt}</span>
                                        </div>
                                        <div className="doc-actions">
                                            <button type="button" className="doc-action-btn">
                                                <Download size={16} />
                                            </button>
                                            <button type="button" className="doc-action-btn delete" onClick={() => handleDeleteDoc(doc.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onBack}>Cancel</button>
                        <button type="submit" className="save-btn">
                            <Save size={18} />
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileEdit;
