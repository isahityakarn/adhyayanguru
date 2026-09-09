import { get, patch } from "../utils/api";

/**
 * Fetch paginated user list. Super-admin only.
 *
 * @param {Object} params - { search, role, status, sort, direction, per_page, page }
 */
export function getUsers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  return get(`/admin/users${qs ? `?${qs}` : ""}`);
}

/**
 * Block or unblock a user. Super-admin only.
 *
 * @param {number} userId
 * @param {'active'|'blocked'} status
 */
export function updateUserStatus(userId, status) {
  return patch(`/admin/users/${userId}/status`, { status });
}

export function getUserProgress(userId) {
  return get(`/admin/users/${userId}/progress`);
}
