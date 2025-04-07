"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function Page() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<{
    [key: number]: { draft: boolean; content: boolean };
  }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [table, setTable] = useState<string>("haolamproject_edit");

  useEffect(() => {
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    const fetchNotes = async () => {
      setLoading(true);
      const { data } = await supabase.from(table).select();
      setNotes(data || []);
      setLoading(false);
    };

    fetchNotes();

    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setSubmitting(id);
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    const status = action === "approve" ? "approved" : "rejected";

    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating status:", error);
      showToast("❌ Error updating status: " + error.message);
    } else {
      showToast(`✅ Successfully ${status} ID: ${id}`);
      const { data } = await supabase.from(table).select();
      setNotes(data || []);
    }

    setSubmitting(null);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleExpand = (id: number, field: "draft" | "content") => {
    setExpanded((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: !prev[id]?.[field],
      },
    }));
  };

  const filteredNotes = notes.filter((note) => {
    if (filter === "all") return true;
    if (filter === "pending") return !note.status || note.status === "pending";
    return note.status === filter;
  });

  const getStatusBadge = (status?: string) => {
    let bgColor = "#999";
    if (status === "approved") bgColor = "#4CAF50";
    else if (status === "pending" || !status) bgColor = "#FFC107";
    else if (status === "rejected") bgColor = "#F44336";

    return (
      <span
        style={{
          backgroundColor: bgColor,
          color: "#fff",
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          marginLeft: "8px",
          textTransform: "uppercase",
        }}
      >
        {status || "pending"}
      </span>
    );
  };

  const buttonStyle = (
    color: string,
    disabled: boolean,
    isSecondary = false
  ) => ({
    flex: 1,
    backgroundColor: disabled ? "#999" : isSecondary ? "#ccc" : color,
    color: isSecondary ? "#333" : "white",
    border: "none",
    padding: "8px",
    borderRadius: "4px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    opacity: disabled ? 0.6 : 1,
    fontSize: "13px",
  });

  const getTextWithToggle = (
    text: string,
    id: number,
    field: "draft" | "content"
  ) => {
    const isExpanded = expanded[id]?.[field];
    if (!text) return "N/A";
    if (text.length <= 100) return text;

    return (
      <>
        {isExpanded ? text : text.slice(0, 100) + "... "}
        <span
          onClick={() => toggleExpand(id, field)}
          style={{
            marginLeft: "4px",
            fontSize: "12px",
            color: "#1e88e5",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {isExpanded ? "Thu gọn" : "Xem thêm"}
        </span>
      </>
    );
  };

  return (
    <div style={{ padding: "16px" }}>
      {/* Table Selector */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginRight: "16px",
          }}
        >
          <option value="haolamproject_edit">haolamproject_edit</option>
          {/* Sau này bạn thêm nhiều table vào đây */}
        </select>

        {/* Filter Buttons */}
        {["all", "pending", "approved", "rejected"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: filter === status ? "#333" : "#fff",
              color: filter === status ? "#fff" : "#000",
              cursor: "pointer",
              transition: "all 0.2s",
              marginRight: "8px",
              fontSize: "13px",
            }}
          >
            {status.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "flex-start",
          }}
        >
          {filteredNotes.map((note) => {
            const isDone =
              note.status === "approved" || note.status === "rejected";

            return (
              <div
                key={note.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "16px",
                  width: "300px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-color)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <p style={{ fontSize: "12px", marginBottom: "4px" }}>
                  <strong>ID:</strong> {note.id}
                </p>
                <p style={{ fontSize: "13px", marginBottom: "4px" }}>
                  <strong>Status:</strong> {getStatusBadge(note.status)}
                </p>
                <p style={{ fontSize: "13px", marginBottom: "4px" }}>
                  <strong>Draft:</strong>{" "}
                  {getTextWithToggle(note.deepseek_draft, note.id, "draft")}
                </p>
                <p style={{ fontSize: "13px", marginBottom: "12px" }}>
                  <strong>Content:</strong>{" "}
                  {getTextWithToggle(note.content, note.id, "content")}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    style={buttonStyle(
                      "#4CAF50",
                      submitting === note.id || isDone
                    )}
                    onClick={() => handleAction(note.id, "approve")}
                    disabled={submitting === note.id || isDone}
                  >
                    {submitting === note.id ? "Submitting..." : "Approve"}
                  </button>
                  <button
                    style={buttonStyle(
                      "#ccc",
                      submitting === note.id || isDone,
                      true
                    )}
                    onClick={() => handleAction(note.id, "reject")}
                    disabled={submitting === note.id || isDone}
                  >
                    {submitting === note.id ? "Submitting..." : "Reject"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#333",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 1000,
            fontSize: "14px",
          }}
        >
          {toast}
        </div>
      )}

      {/* Light/Dark mode CSS + Spinner */}
      <style jsx global>{`
        body {
          --card-bg: #fff;
          --text-color: #000;
        }
        @media (prefers-color-scheme: dark) {
          body {
            --card-bg: #1e1e1e;
            --text-color: #fff;
          }
          button {
            border-color: #555;
          }
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-top-color: #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
