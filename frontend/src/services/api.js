const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    return `${BASE_URL}${photoPath}`;
};

export const authAPI = {
    login: async (username, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return response.json();
    },

    getProfile: async () => {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    register: async (userData) => {
        console.log('Registering user with data:', userData);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(userData)
        });
        return response.json();
    }
};

export const usersAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/users`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getForPeerRating: async () => {
        const response = await fetch(`${API_URL}/users/peer-rating/employees`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    updateMyProfile: async (profileData) => {
        try {
            const response = await fetch(`${API_URL}/users/profile/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({ profile: profileData })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: errorData.message || `Server error: ${response.status}`
                };
            }

            return response.json();
        } catch (error) {
            console.error('updateMyProfile error:', error);
            return { success: false, message: error.message };
        }
    },

    changePassword: async (passwordData) => {
        const response = await fetch(`${API_URL}/users/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(passwordData)
        });
        return response.json();
    },

    update: async (id, userData) => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(userData)
        });
        return response.json();
    },

    delete: async (id) => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    uploadProfilePhoto: async (userId, photoFile) => {
        const formData = new FormData();
        formData.append('photo', photoFile);

        const response = await fetch(`${API_URL}/users/${userId}/upload-photo`, {
            method: 'POST',
            headers: {
                ...getAuthHeader()
                // Don't set Content-Type - browser will set it with boundary for FormData
            },
            body: formData
        });
        return response.json();
    }
};

export const attendanceAPI = {
    checkIn: async (location) => {
        const response = await fetch(`${API_URL}/attendance/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ location })
        });
        return response.json();
    },

    checkOut: async (notes) => {
        const response = await fetch(`${API_URL}/attendance/check-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ notes })
        });
        return response.json();
    },

    getMy: async (month, year) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);

        const response = await fetch(`${API_URL}/attendance/my?${params}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getAll: async (date) => {
        const params = date ? `?date=${date}` : '';
        const response = await fetch(`${API_URL}/attendance${params}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getSubordinates: async () => {
        const response = await fetch(`${API_URL}/attendance/subordinates/status`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    markStatus: async (userId, status) => {
        const response = await fetch(`${API_URL}/attendance/mark-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ userId, status })
        });
        return response.json();
    }
};

export const leaveAPI = {
    apply: async (leaveData) => {
        const response = await fetch(`${API_URL}/leave/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(leaveData)
        });
        return response.json();
    },

    getMy: async (status, year) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (year) params.append('year', year);

        const response = await fetch(`${API_URL}/leave/my?${params}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getAll: async (status) => {
        const params = status ? `?status=${status}` : '';
        const response = await fetch(`${API_URL}/leave/all${params}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getPending: async () => {
        const response = await fetch(`${API_URL}/leave/pending`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    approve: async (id, remarks) => {
        const response = await fetch(`${API_URL}/leave/${id}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ remarks })
        });
        return response.json();
    },

    reject: async (id, remarks) => {
        const response = await fetch(`${API_URL}/leave/${id}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ remarks })
        });
        return response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_URL}/leave/${id}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

export const dashboardAPI = {
    getStats: async () => {
        const response = await fetch(`${API_URL}/dashboard`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

export const efilingAPI = {
    sendFile: async (formData) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/efiling/send`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: formData
        });
        return response.json();
    },

    getInbox: async (page = 1) => {
        const response = await fetch(`${API_URL}/efiling/inbox?page=${page}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getSent: async (page = 1) => {
        const response = await fetch(`${API_URL}/efiling/sent?page=${page}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getHistory: async (page = 1, filter = '') => {
        const params = new URLSearchParams({ page });
        if (filter) params.append('filter', filter);
        const response = await fetch(`${API_URL}/efiling/history?${params}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    markAsRead: async (id) => {
        const response = await fetch(`${API_URL}/efiling/${id}/read`, {
            method: 'PATCH',
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getDownloadUrl: (id) => {
        const token = localStorage.getItem('token');
        return `${API_URL}/efiling/download/${id}?token=${token}`;
    },

    downloadFile: async (id) => {
        const response = await fetch(`${API_URL}/efiling/download/${id}`, {
            headers: { ...getAuthHeader() }
        });
        return response;
    },

    getUnreadCount: async () => {
        const response = await fetch(`${API_URL}/efiling/unread-count`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    deleteFile: async (id) => {
        const response = await fetch(`${API_URL}/efiling/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    forwardFile: async (data) => {
        const response = await fetch(`${API_URL}/efiling/forward`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    getFileThread: async (id) => {
        const response = await fetch(`${API_URL}/efiling/track/${id}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

export const peerRatingAPI = {
    save: async (ratings, month, year) => {
        const response = await fetch(`${API_URL}/peer-rating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ ratings, month, year })
        });
        return response.json();
    },

    getMyRatings: async (month, year) => {
        const response = await fetch(`${API_URL}/peer-rating?month=${month}&year=${year}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getAverageRatings: async (month, year) => {
        const response = await fetch(`${API_URL}/peer-rating/averages?month=${month}&year=${year}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

export const variableRemunerationAPI = {
    save: async (remunerationData, month, year) => {
        const response = await fetch(`${API_URL}/variable-remuneration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ remunerationData, month, year })
        });
        return response.json();
    },

    get: async (month, year) => {
        const response = await fetch(`${API_URL}/variable-remuneration?month=${month}&year=${year}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

export const remunerationAPI = {
    getAttendanceSummary: async (month, year) => {
        const response = await fetch(`${API_URL}/remuneration/attendance-summary?month=${month}&year=${year}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

export const holidaysAPI = {
    getByYear: async (year) => {
        const response = await fetch(`${API_URL}/holidays/${year}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    add: async (holidayData) => {
        const response = await fetch(`${API_URL}/holidays`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(holidayData)
        });
        return response.json();
    },

    update: async (id, holidayData) => {
        const response = await fetch(`${API_URL}/holidays/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(holidayData)
        });
        return response.json();
    },

    delete: async (id) => {
        const response = await fetch(`${API_URL}/holidays/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    deleteByDate: async (date) => {
        const response = await fetch(`${API_URL}/holidays/date/${date}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

// ============= ADMIN API =============
export const adminAPI = {
    // Role Management
    getRoles: async () => {
        const response = await fetch(`${API_URL}/admin/roles`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    getRole: async (roleId) => {
        const response = await fetch(`${API_URL}/admin/roles/${roleId}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    createRole: async (roleData) => {
        const response = await fetch(`${API_URL}/admin/roles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(roleData)
        });
        return response.json();
    },

    updateRole: async (roleId, roleData) => {
        const response = await fetch(`${API_URL}/admin/roles/${roleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(roleData)
        });
        return response.json();
    },

    deleteRole: async (roleId) => {
        const response = await fetch(`${API_URL}/admin/roles/${roleId}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    // Component & Feature Definitions
    getComponents: async () => {
        const response = await fetch(`${API_URL}/admin/components`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    // Initialization
    initializeRoles: async () => {
        const response = await fetch(`${API_URL}/admin/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        });
        return response.json();
    },

    resetRoles: async () => {
        const response = await fetch(`${API_URL}/admin/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        });
        return response.json();
    },

    // Statistics
    getStats: async () => {
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    // Get all valid roles (system + custom)
    getAllValidRoles: async () => {
        const response = await fetch(`${API_URL}/admin/valid-roles`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    },

    // Get user permissions for a specific role
    getUserPermissions: async (roleId) => {
        const response = await fetch(`${API_URL}/admin/user-permissions/${roleId}`, {
            headers: { ...getAuthHeader() }
        });
        return response.json();
    }
};

