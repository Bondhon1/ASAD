"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { useModal } from "@/components/ui/ModalProvider";
import Link from "next/link";

interface PostReport {
  id: string;
  postId: string;
  reason: string;
  description: string | null;
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  post: {
    id: string;
    content: string;
    isDeleted: boolean;
    createdAt: string;
    author: {
      id: string;
      fullName: string | null;
      volunteerId: string | null;
    };
  };
  reporter: {
    id: string;
    fullName: string | null;
    volunteerId: string | null;
    email: string;
  };
  resolvedBy: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
}

export default function CommunityReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || null;
  const { user, loading: userLoading } = useCachedUserProfile<any>(userEmail);

  const [reports, setReports] = useState<PostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED">("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { confirm, prompt, toast } = useModal();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (!user || userLoading) return;
    if (!["MASTER", "ADMIN"].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
    fetchReports();
  }, [user, userLoading, page, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        status: statusFilter === "ALL" ? "ALL" : statusFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      const res = await fetch(`/api/admin/community/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");

      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast((error as Error).message || "Failed to fetch reports", { type: "error" });
    }
    setLoading(false);
  };

  const handleResolve = async (reportId: string, postId: string, action: "delete" | "ban" | "deletePost", userId: string) => {
    if (action === "delete") {
      const ok = await confirm(
        "Are you sure you want to DELETE this user? All their data will be permanently removed.",
        "Delete User",
        "warning"
      );
      if (!ok) return;

      setProcessing(reportId);
      try {
        // Delete the user
        const deleteRes = await fetch(`/api/hr/users/${userId}`, {
          method: "DELETE",
        });

        if (!deleteRes.ok) throw new Error("Failed to delete user");

        // Mark report as resolved
        const reportRes = await fetch(`/api/admin/community/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RESOLVED", notes: "User deleted - violating post removed" }),
        });

        if (!reportRes.ok) throw new Error("Failed to update report");

        toast("User deleted and report resolved", { type: "success" });
        fetchReports();
      } catch (error) {
        toast((error as Error).message || "Failed to delete user", { type: "error" });
      }
      setProcessing(null);
      setOpenDropdown(null);
    } else if (action === "ban") {
      const ok = await confirm(
        "Are you sure you want to BAN this user? They will not be able to log in.",
        "Ban User",
        "warning"
      );
      if (!ok) return;

      setProcessing(reportId);
      try {
        // Ban the user
        const banRes = await fetch(`/api/hr/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "BANNED" }),
        });

        if (!banRes.ok) throw new Error("Failed to ban user");

        // Mark report as resolved
        const reportRes = await fetch(`/api/admin/community/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RESOLVED", notes: "User banned - violating post removed" }),
        });

        if (!reportRes.ok) throw new Error("Failed to update report");

        toast("User banned and report resolved", { type: "success" });
        fetchReports();
      } catch (error) {
        toast((error as Error).message || "Failed to ban user", { type: "error" });
      }
      setProcessing(null);
      setOpenDropdown(null);
    } else if (action === "deletePost") {
      const ok = await confirm(
        "Are you sure you want to DELETE this post? It will be permanently removed.",
        "Delete Post",
        "warning"
      );
      if (!ok) return;

      setProcessing(reportId);
      try {
        // Delete the post
        const postRes = await fetch(`/api/community/posts/${postId}`, {
          method: "DELETE",
        });

        if (!postRes.ok) throw new Error("Failed to delete post");

        // Mark report as resolved
        const reportRes = await fetch(`/api/admin/community/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RESOLVED", notes: "Post deleted" }),
        });

        if (!reportRes.ok) throw new Error("Failed to update report");

        toast("Post deleted and report resolved", { type: "success" });
        fetchReports();
      } catch (error) {
        toast((error as Error).message || "Failed to delete post", { type: "error" });
      }
      setProcessing(null);
      setOpenDropdown(null);
    }
  };

  const handleDismiss = async (reportId: string) => {
    const ok = await confirm(
      "Are you sure you want to dismiss this report?",
      "Dismiss Report",
      "warning"
    );
    if (!ok) return;

    setProcessing(reportId);
    try {
      const res = await fetch(`/api/admin/community/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED", notes: "Dismissed by admin" }),
      });

      if (!res.ok) throw new Error("Failed to dismiss report");

      toast("Report dismissed", { type: "success" });
      fetchReports();
    } catch (error) {
      toast((error as Error).message || "Failed to dismiss report", { type: "error" });
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      REVIEWED: "bg-blue-50 text-blue-700 border border-blue-200",
      RESOLVED: "bg-red-50 text-red-700 border border-red-200",
      DISMISSED: "bg-gray-50 text-gray-700 border border-gray-200",
    };
    return styles[status] || styles.PENDING;
  };

  const getReasonBadge = (reason: string) => {
    const styles: Record<string, string> = {
      INAPPROPRIATE: "bg-red-50 text-red-700 border border-red-200",
      SPAM: "bg-orange-50 text-orange-700 border border-orange-200",
      OFFENSIVE: "bg-purple-50 text-purple-700 border border-purple-200",
      OTHER: "bg-gray-50 text-gray-700 border border-gray-200",
    };
    return styles[reason] || styles.OTHER;
  };

  const totalPages = Math.ceil(total / pageSize);

  if (userLoading) {
    return (
      <DashboardLayout userRole={user?.role || "VOLUNTEER"} userName={user?.fullName || ""} userEmail={user?.email || ""} userId={user?.id || ""}>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user?.role || "VOLUNTEER"} userName={user?.fullName || ""} userEmail={user?.email || ""} userId={user?.id || ""}>
      <div className="bg-slate-50/30 min-h-[calc(100vh-140px)] py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-slate-900">
                Community Post Reports
              </h1>
              <Link
                href="/dashboard/community"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Back to Community
              </Link>
            </div>
            <p className="text-sm text-slate-600">
              Manage reports submitted about community posts
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                Filter by Status:
              </label>
              <div className="flex gap-2">
                {(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED", "ALL"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setPage(1);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? "bg-[#1E3A5F] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Total: {total} report{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse"
                >
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <p className="text-slate-500 text-sm">No reports found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getReasonBadge(report.reason)}`}>
                            {report.reason}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(report.status)}`}>
                            {report.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(report.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          <span className="font-medium">Post:</span> {report.post.content}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === report.id ? null : report.id)
                        }
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            expandedId === report.id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === report.id && (
                    <div className="p-4 bg-slate-50 space-y-3">
                      {/* Reporter Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 mb-1">
                          Reported by:
                        </h4>
                        <p className="text-sm text-slate-600">
                          {report.reporter.fullName} ({report.reporter.email})
                          {report.reporter.volunteerId && (
                            <span className="text-xs text-slate-500 ml-1">
                              #{report.reporter.volunteerId}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Post Author Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 mb-1">
                          Post Author:
                        </h4>
                        <p className="text-sm text-slate-600">
                          {report.post.isDeleted ? (
                            <span className="text-red-600">[Post Deleted]</span>
                          ) : (
                            <>
                              {report.post.author.fullName}
                              {report.post.author.volunteerId && (
                                <span className="text-xs text-slate-500 ml-1">
                                  #{report.post.author.volunteerId}
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Report Description */}
                      {report.description && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-700 mb-1">
                            Report Details:
                          </h4>
                          <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                            {report.description}
                          </p>
                        </div>
                      )}

                      {/* Resolution Info */}
                      {report.resolvedBy && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-700 mb-1">
                            Resolved by:
                          </h4>
                          <p className="text-sm text-slate-600">
                            {report.resolvedBy.fullName} ({report.resolvedBy.email})
                          </p>
                          {report.resolutionNotes && (
                            <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                              <span className="font-medium">Notes:</span> {report.resolutionNotes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {report.status === "PENDING" && (
                        <div className="flex gap-2 pt-2">
                          {/* Resolve Dropdown */}
                          <div className="relative flex-1">
                            <button
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown === report.id ? null : report.id
                                )
                              }
                              disabled={processing === report.id}
                              className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              Resolve
                              <svg
                                className={`w-4 h-4 transform transition-transform ${
                                  openDropdown === report.id ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                />
                              </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {openDropdown === report.id && (
                              <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-slate-200 rounded shadow-lg z-10">
                                <button
                                  onClick={() =>
                                    handleResolve(
                                      report.id,
                                      report.postId,
                                      "deletePost",
                                      report.post.author.id
                                    )
                                  }
                                  disabled={processing === report.id}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 border-b border-slate-100"
                                >
                                  Delete Post
                                </button>
                                <button
                                  onClick={() =>
                                    handleResolve(
                                      report.id,
                                      report.postId,
                                      "ban",
                                      report.post.author.id
                                    )
                                  }
                                  disabled={processing === report.id}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 border-b border-slate-100"
                                >
                                  Ban User
                                </button>
                                <button
                                  onClick={() =>
                                    handleResolve(
                                      report.id,
                                      report.postId,
                                      "delete",
                                      report.post.author.id
                                    )
                                  }
                                  disabled={processing === report.id}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                >
                                  Delete User
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDismiss(report.id)}
                            disabled={processing === report.id}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded transition-colors hover:bg-gray-400 disabled:opacity-50"
                          >
                            {processing === report.id ? "Processing..." : "Dismiss"}
                          </button>
                        </div>
                      )}

                      {/* View Post Link */}
                      {!report.post.isDeleted && (
                        <div className="pt-2">
                          <Link
                            href={`/dashboard/community?post=${report.post.id}`}
                            className="text-sm text-[#1E3A5F] hover:underline font-medium"
                          >
                            View Post in Community →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded ${
                    page === p
                      ? "bg-[#1E3A5F] text-white"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
