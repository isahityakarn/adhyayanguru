import { get } from "../utils/api";

export function getDashboardStats() {
  return get("/admin/dashboard");
}