import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { getUserProgress, getUsers, updateUserStatus } from "../../../services/userApi";

const ROLE_LABELS = {
  student: "Student",
  parent: "Parent",
  admin: "Admin",
  super_admin: "Super Admin",
  "1": "Super Admin",
  "2": "Admin",
};

const ROLE_PILL = {
  super_admin: "available",
  "1": "available",
  admin: "available",
  "2": "available",
  parent: "pending",
  student: "pending",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // draft input, committed on Enter / button
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Status update
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");

  const handleStudentClick = async (user) => {
    if (user.role !== "student") return;
    setSelectedStudent(user);
    setStudentProgress(null);
    setProgressError("");
    setProgressLoading(true);
    try {
      const response = await getUserProgress(user.id);
      setStudentProgress(response.data || response);
    } catch (err) {
      setProgressError(err.message || "Failed to load student progress.");
    } finally {
      setProgressLoading(false);
    }
  };

  // Single fetch function — always reads directly from parameters, no stale closure
  const fetchUsers = async (params) => {
    setLoading(true);
    setError("");
    try {
      const res = await getUsers({
        search: params.search,
        role: params.role,
        status: params.status,
        page: params.page,
        per_page: 15,
        sort: "created_at",
        direction: "desc",
      });
      setUsers(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      if (err.message?.includes("403") || err.message?.includes("Administrator")) {
        setError("Administrator access is required to view users.");
      } else {
        setError(err.message || "Failed to load users.");
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever any filter or page changes
  useEffect(() => {
    fetchUsers({ search, role: roleFilter, status: statusFilter, page });
  }, [search, roleFilter, statusFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRoleChange = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchUsers({ search, role: roleFilter, status: statusFilter, page });
  };

  const handleToggleStatus = async (user) => {
    const next = user.status === "active" ? "blocked" : "active";
    setUpdatingId(user.id);
    try {
      await updateUserStatus(user.id, next);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: next } : u)),
      );
    } catch (err) {
      setError(err.message || "Failed to update user status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Summary counts from current page
  const counts = users.reduce(
    (acc, u) => {
      acc.total++;
      if (["admin", "super_admin", "1", "2"].includes(String(u.role))) acc.admins++;
      else if (u.role === "student") acc.students++;
      else if (u.role === "parent") acc.parents++;
      return acc;
    },
    { total: 0, admins: 0, students: 0, parents: 0 },
  );

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">Access Control</span>
          <h1>User Management</h1>
          <p>View and manage all registered user accounts.</p>
        </div>
        <button
          className="admin-secondary-button"
          onClick={handleRefresh}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <section className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Users size={18} /></div>
          <span>Total users</span>
          <strong>{pagination ? pagination.total : "--"}</strong>
          <small>All registered accounts</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><ShieldCheck size={18} /></div>
          <span>Admins</span>
          <strong>{loading ? "--" : counts.admins}</strong>
          <small>Admin &amp; super-admin</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><BookOpen size={18} /></div>
          <span>Students</span>
          <strong>{loading ? "--" : counts.students}</strong>
          <small>Learning dashboard access</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><Users size={18} /></div>
          <span>Parents</span>
          <strong>{loading ? "--" : counts.parents}</strong>
          <small>Progress tracking access</small>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="admin-alert" style={{ marginBottom: "16px" }}>
          <X size={16} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ flexWrap: "wrap", gap: "10px" }}>
        <form
          className="admin-search"
          style={{ flex: 1, minWidth: "200px" }}
          onSubmit={handleSearchSubmit}
        >
          <Search size={17} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone — press Enter"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => handleRoleChange(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #e5e8ed",
            fontSize: "13px",
            background: "#fff",
            fontWeight: "600",
            color: "#334155",
          }}
        >
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="parent">Parent</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #e5e8ed",
            fontSize: "13px",
            background: "#fff",
            fontWeight: "600",
            color: "#334155",
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>

        {pagination && (
          <span className="admin-result-count">
            {pagination.total} user{pagination.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className="admin-loading">
                    <span /><span /><span />
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="admin-table-empty" style={{ padding: "32px" }}>
                    <Users size={22} />
                    <span>No users found.</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleStudentClick(user)}
                  style={{ cursor: user.role === "student" ? "pointer" : "default" }}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        className="admin-user-avatar"
                        style={{
                          background: ["admin", "super_admin", "1", "2"].includes(
                            String(user.role),
                          )
                            ? "#e26d4d"
                            : "#42537a",
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <strong style={{ fontSize: "13px" }}>{user.name}</strong>
                        {user.language_pref && (
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {user.language_pref.replace("_", " ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "13px" }}>{user.email}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {user.phone}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-pill ${ROLE_PILL[user.role] ?? "pending"}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-pill ${user.status === "active" ? "available" : "pending"}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "13px", color: "#64748b" }}>
                    {user.created_at}
                  </td>
                  <td>
                    <div
                      className="admin-row-actions"
                      style={{ justifyContent: "flex-end" }}
                    >
                      <button
                        title={user.status === "active" ? "Block user" : "Unblock user"}
                        disabled={updatingId === user.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleStatus(user);
                        }}
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "4px 10px",
                          borderRadius: "5px",
                          border: "none",
                          cursor: "pointer",
                          background: user.status === "active" ? "#fee2e2" : "#dcfce7",
                          color: user.status === "active" ? "#b91c1c" : "#15803d",
                        }}
                      >
                        {updatingId === user.id
                          ? "..."
                          : user.status === "active"
                            ? "Block"
                            : "Unblock"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: "1px solid #f1f5f9",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            <span>
              Page {pagination.current_page} of {pagination.last_page}
              &nbsp;·&nbsp;{pagination.total} total
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="admin-secondary-button"
                disabled={pagination.current_page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="admin-secondary-button"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="admin-modal-container"
            style={{ maxWidth: "860px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <span className="admin-kicker">Student progress</span>
                <h2 style={{ margin: "4px 0 0" }}>{selectedStudent.name}</h2>
                <small style={{ color: "#64748b" }}>{selectedStudent.email}</small>
              </div>
              <button
                className="admin-icon-button"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close student progress"
              >
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              {progressLoading && <div className="admin-loading"><span /><span /><span /></div>}
              {progressError && <div className="admin-alert"><X size={16} /><span>{progressError}</span></div>}
              {studentProgress && (
                <>
                  <div className="admin-stat-grid" style={{ marginBottom: "20px" }}>
                    <div className="admin-stat-card">
                      <span>Completed subjects</span>
                      <strong>{studentProgress.summary.completed_subjects}</strong>
                      <small>of {studentProgress.summary.total_subjects}</small>
                    </div>
                    <div className="admin-stat-card">
                      <span>Total marks</span>
                      <strong>{studentProgress.summary.total_marks} / {studentProgress.summary.max_marks}</strong>
                      <small>Latest completed quiz attempts</small>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {studentProgress.subjects.map((subject) => (
                      <div key={subject.id} style={{ border: "1px solid #e5e8ed", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                          <strong>{subject.name}</strong>
                          <span className={`admin-pill ${subject.completed ? "available" : "pending"}`}>
                            {subject.completed ? "Completed" : `${subject.completed_chapters}/${subject.total_chapters} chapters`}
                          </span>
                        </div>
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                          {subject.chapters.map((chapter) => (
                            <div key={chapter.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                              <span>{chapter.title}</span>
                              <span>{chapter.marks === null ? "No marks" : `${chapter.marks} / ${chapter.max_marks}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
