import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, peerRatingAPI } from '../services/api';
import './PeerRating.css';

const PeerRating = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Get current month and year
    const currentDate = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const [usersData, ratingsData] = await Promise.all([
                usersAPI.getForPeerRating(),
                peerRatingAPI.getMyRatings(currentMonth, currentYear)
            ]);

            if (usersData.success && usersData.users) {
                // Create a map of saved ratings for easy lookup
                const savedRatingsMap = {};
                if (ratingsData.success && ratingsData.ratings) {
                    ratingsData.ratings.forEach(rating => {
                        savedRatingsMap[rating.ratedEmployee] = rating;
                    });
                }

                // Filter out current user (can't rate themselves)
                const otherEmployees = usersData.users
                    .filter(emp => emp._id !== user?.id 
                        && emp.username !== user?.username &&
                        emp.role !== 'FACULTY_IN_CHARGE'
                     )
                    .map(emp => ({
                        id: emp._id,
                        name: emp.profile?.firstName
                            ? `${emp.profile.gender === 'Male' ? 'Mr.' : 'Mrs.'} ${emp.profile.firstName} ${emp.profile.lastName || ''}`
                            : emp.username,
                        designation: emp.employment?.designation || emp.role,
                        responsiveness: savedRatingsMap[emp._id]?.responsiveness || '',
                        teamSpirit: savedRatingsMap[emp._id]?.teamSpirit || ''
                    }));
                setEmployees(otherEmployees);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalScore = (emp) => {
        const r = parseFloat(emp.responsiveness) || 0;
        const t = parseFloat(emp.teamSpirit) || 0;
        return r + t;
    };

    const handleScoreChange = (id, field, value) => {
        // Validate input (0-10)
        let numValue = value === "" ? "" : parseFloat(value);
        if (numValue !== "" && (numValue < 0 || numValue > 10)) return;

        setEmployees(employees.map(emp =>
            emp.id === id ? { ...emp, [field]: value } : emp
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const ratings = employees.map(emp => ({
                employeeId: emp.id,
                responsiveness: emp.responsiveness === '' ? 0 : emp.responsiveness,
                teamSpirit: emp.teamSpirit === '' ? 0 : emp.teamSpirit
            }));

            console.log('Sending ratings:', ratings); // Debug log

            const response = await peerRatingAPI.save(ratings, currentMonth, currentYear);
            console.log('Save response:', response); // Debug log

            if (response.success) {
                alert('Ratings saved successfully!');
            } else {
                alert(response.message || 'Failed to save ratings');
            }
        } catch (error) {
            console.error('Failed to save ratings:', error);
            alert('Failed to save ratings. Please try again.');
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="peer-rating-container">
                <div className="loading">Loading employees...</div>
            </div>
        );
    }

    return (
        <div className="peer-rating-container">
            <div className="rating-header">
                <h2>NIT Raipur Foundation for Innovation & Entrepreneurship (NITRR-FIE)</h2>
                <h3>Peer Rating of Colleagues for the Month {currentMonth} {currentYear}</h3>
            </div>

            <div className="table-container">
                <table className="rating-table">
                    <thead>
                        <tr>
                            <th>S. No.</th>
                            <th>Name</th>
                            <th>Responsiveness (Out of 10)</th>
                            <th>Team Spirit (Out of 10)</th>
                            <th>Total Score (Out of 20)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="no-data">No other employees to rate</td>
                            </tr>
                        ) : (
                            employees.map((emp, index) => {
                                const totalScore = calculateTotalScore(emp);

                                return (
                                    <tr key={emp.id}>
                                        <td>{index + 1}</td>
                                        <td className="name-cell">
                                            <div className="emp-name">{emp.name}</div>
                                            <div className="emp-designation">{emp.designation}</div>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="score-input"
                                                value={emp.responsiveness}
                                                onChange={(e) => handleScoreChange(emp.id, 'responsiveness', e.target.value)}
                                                max="10"
                                                min="0"
                                                placeholder="0-10"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="score-input"
                                                value={emp.teamSpirit}
                                                onChange={(e) => handleScoreChange(emp.id, 'teamSpirit', e.target.value)}
                                                max="10"
                                                min="0"
                                                placeholder="0-10"
                                            />
                                        </td>
                                        <td className="total-score">{totalScore}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="rating-footer">
                <div className="signature-section">
                    {/* Signature removed as per request */}
                </div>

                <div className="action-buttons">
                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={saving || employees.length === 0}
                    >
                        {saving ? 'Saving...' : 'Save Ratings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PeerRating;
