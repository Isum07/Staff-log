let currentUser = null;
let leaveRequests = [];
let filteredRequests = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    loadUserInfo();
    loadLeaveRequests();
});

async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        currentUser = await response.json();
    } catch (error) {
        window.location.href = '/login';
    }
}

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Apply Leave Button
    const applyLeaveBtn = document.getElementById('applyLeaveBtn');
    if (applyLeaveBtn) {
        applyLeaveBtn.addEventListener('click', () => {
            document.getElementById('leaveModal').style.display = 'block';
        });
    }

    // Modal close
    const modal = document.getElementById('leaveModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resetLeaveForm();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resetLeaveForm();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            resetLeaveForm();
        }
    });

    // Leave type change - show/hide document upload
    const leaveTypeSelect = document.getElementById('leave_type');
    const documentGroup = document.getElementById('documentGroup');
    const documentInput = document.getElementById('document');

    if (leaveTypeSelect) {
        leaveTypeSelect.addEventListener('change', function() {
            if (this.value === 'medical') {
                documentGroup.style.display = 'block';
                documentInput.required = true;
            } else {
                documentGroup.style.display = 'none';
                documentInput.required = false;
                documentInput.value = '';
            }
        });
    }

    // Leave form submission
    const leaveForm = document.getElementById('leaveForm');
    if (leaveForm) {
        leaveForm.addEventListener('submit', handleLeaveSubmission);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadLeaveRequests);
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchAndFilter);
    }

    // Filter selects
    const filterStatus = document.getElementById('filterStatus');
    const filterLeaveType = document.getElementById('filterLeaveType');
    if (filterStatus) {
        filterStatus.addEventListener('change', handleSearchAndFilter);
    }
    if (filterLeaveType) {
        filterLeaveType.addEventListener('change', handleSearchAndFilter);
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
}

function loadUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.fullName || currentUser.username;
        const roleBadge = document.getElementById('userRole');
        roleBadge.textContent = currentUser.role;
        
        // Show apply button only for teachers
        if (currentUser.role === 'teacher') {
            document.getElementById('applyLeaveBtn').style.display = 'block';
        }

        // Show admin actions header if admin
        if (currentUser.role === 'admin') {
            document.getElementById('adminActionsHeader').style.display = 'table-cell';
        }
    }
}

async function loadLeaveRequests() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const table = document.getElementById('leaveTable');
    const noDataMessage = document.getElementById('noDataMessage');
    const tableBody = document.getElementById('leaveTableBody');

    loadingIndicator.style.display = 'block';
    table.style.display = 'none';
    noDataMessage.style.display = 'none';

    try {
        const response = await fetch('/api/leave-requests');
        if (!response.ok) throw new Error('Failed to load leave requests');

        leaveRequests = await response.json();
        
        loadingIndicator.style.display = 'none';

        if (leaveRequests.length === 0) {
            noDataMessage.style.display = 'block';
        } else {
            filteredRequests = [...leaveRequests];
            applyFilters();
        }
    } catch (error) {
        console.error('Error loading leave requests:', error);
        loadingIndicator.textContent = 'Error loading leave requests';
    }
}

function handleSearchAndFilter() {
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const statusFilter = document.getElementById('filterStatus').value;
    const leaveTypeFilter = document.getElementById('filterLeaveType').value;

    filteredRequests = leaveRequests.filter(request => {
        // Search filter
        const matchesSearch = !searchTerm || 
            request.id.toString().includes(searchTerm) ||
            (request.full_name || request.username || '').toLowerCase().includes(searchTerm) ||
            (request.reason || '').toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStatus = !statusFilter || request.status === statusFilter;

        // Leave type filter
        const matchesLeaveType = !leaveTypeFilter || request.leave_type === leaveTypeFilter;

        return matchesSearch && matchesStatus && matchesLeaveType;
    });

    renderLeaveRequests();
    updateResultsCount();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterLeaveType').value = '';
    applyFilters();
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        const total = leaveRequests.length;
        const filtered = filteredRequests.length;
        if (filtered === total) {
            resultsCount.textContent = `${total} request${total !== 1 ? 's' : ''}`;
        } else {
            resultsCount.textContent = `${filtered} of ${total} request${total !== 1 ? 's' : ''}`;
        }
    }
}

function renderLeaveRequests() {
    const tableBody = document.getElementById('leaveTableBody');
    const table = document.getElementById('leaveTable');
    const noDataMessage = document.getElementById('noDataMessage');
    
    tableBody.innerHTML = '';

    if (filteredRequests.length === 0) {
        table.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = leaveRequests.length === 0 
            ? 'No leave requests found' 
            : 'No leave requests match your search/filter criteria';
    } else {
        table.style.display = 'table';
        noDataMessage.style.display = 'none';

        filteredRequests.forEach(request => {
        const row = document.createElement('tr');
        
        const statusClass = `status-${request.status}`;
        const leaveTypeClass = `leave-type-${request.leave_type}`;

        row.innerHTML = `
            <td><strong>#${request.id}</strong></td>
            <td><strong>${request.full_name || request.username}</strong></td>
            <td><span class="leave-type-badge ${leaveTypeClass}">${request.leave_type === 'medical' ? '🏥' : '🎯'} ${request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}</span></td>
            <td>📅 ${formatDate(request.start_date)}</td>
            <td>📅 ${formatDate(request.end_date)}</td>
            <td>${truncateText(request.reason, 50)}</td>
            <td><span class="status-badge ${statusClass}">${request.status === 'pending' ? '⏳' : request.status === 'approved' ? '✅' : '❌'} ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></td>
            <td>🕐 ${formatDateTime(request.applied_at)}</td>
            ${currentUser.role === 'admin' ? `
                <td>
                    ${request.status === 'pending' ? `
                        <div class="action-buttons">
                            <button class="btn btn-success btn-sm" onclick="reviewLeave(${request.id}, 'approve')">✅ Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="reviewLeave(${request.id}, 'reject')">❌ Reject</button>
                        </div>
                    ` : `
                        <span style="color: var(--text-secondary); font-size: 12px; font-weight: 600;">
                            ${request.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                        </span>
                    `}
                </td>
            ` : ''}
        `;

        // Add document link for medical leaves
        if (request.leave_type === 'medical' && request.document_path) {
            const reasonCell = row.querySelector('td:nth-child(6)');
            const docLink = document.createElement('div');
            docLink.style.marginTop = '8px';
            docLink.innerHTML = `<a href="/api/documents/${request.id}" class="document-link" target="_blank">📎 View Document</a>`;
            reasonCell.appendChild(docLink);
        }

        tableBody.appendChild(row);
    });
}

async function handleLeaveSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const errorMessage = document.getElementById('formErrorMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Clear previous errors
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';

    // Validation
    const leaveType = formData.get('leave_type');
    const startDate = formData.get('start_date');
    const endDate = formData.get('end_date');
    const reason = formData.get('reason');
    const document = formData.get('document');

    if (!leaveType || !startDate || !endDate || !reason) {
        showFormError('All fields are required');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showFormError('End date must be after start date');
        return;
    }

    if (leaveType === 'medical' && !document) {
        showFormError('Document upload is required for medical leave');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const response = await fetch('/api/leave-requests', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Show success message
            showFormSuccess('Leave request submitted successfully!');
            
            // Reset form and close modal after a delay
            setTimeout(() => {
                document.getElementById('leaveModal').style.display = 'none';
                resetLeaveForm();
                loadLeaveRequests();
                clearFilters();
            }, 1500);
        } else {
            showFormError(data.error || 'Failed to submit leave request');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
        }
    } catch (error) {
        console.error('Error submitting leave request:', error);
        showFormError('An error occurred. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request';
    }
}

async function reviewLeave(requestId, action) {
    if (!confirm(`Are you sure you want to ${action} this leave request?`)) {
        return;
    }

    const comments = prompt('Enter comments (optional):');
    
    try {
        const response = await fetch(`/api/leave-requests/${requestId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                comments: comments || null
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(`Leave request ${action}ed successfully!`);
            loadLeaveRequests();
            // Clear filters after action
            clearFilters();
        } else {
            alert(data.error || 'Failed to update leave request');
        }
    } catch (error) {
        console.error('Error reviewing leave request:', error);
        alert('An error occurred. Please try again.');
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });

        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

function resetLeaveForm() {
    const form = document.getElementById('leaveForm');
    form.reset();
    document.getElementById('documentGroup').style.display = 'none';
    document.getElementById('document').required = false;
    document.getElementById('formErrorMessage').classList.remove('show');
    
    // Remove success message if exists
    const successMsg = document.querySelector('.success-message');
    if (successMsg) {
        successMsg.remove();
    }
}

function showFormError(message) {
    const errorMessage = document.getElementById('formErrorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function showFormSuccess(message) {
    const form = document.getElementById('leaveForm');
    const errorMessage = document.getElementById('formErrorMessage');
    
    // Remove error if exists
    errorMessage.classList.remove('show');
    
    // Create success message
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message show';
    successMsg.textContent = message;
    
    form.insertBefore(successMsg, form.firstChild);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Make reviewLeave available globally
window.reviewLeave = reviewLeave;

